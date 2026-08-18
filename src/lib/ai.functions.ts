import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callLovableAI, extractJson } from "./ai-gateway.server";

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];
type Gem = {
  name: string;
  category?: string;
  description?: string;
  hidden_gem_score?: number;
  popularity_score?: number;
  insta_score?: number;
  local_score?: number;
  tourist_score?: number;
  best_time?: string;
  approx_cost?: number;
  tags?: string[];
};
type DiscoveryCard = Gem & { city?: string };
type Itinerary = {
  title: string;
  summary?: string;
  total_cost?: number;
  stops: Array<{
    time: string;
    name: string;
    category?: string;
    duration_min?: number;
    cost?: number;
    why?: string;
    tip?: string;
  }>;
  packing_tip?: string;
};

const SYSTEM_INDIA = `You are Dravik Explore AI, an expert travel intelligence engine for India.
You suggest authentic, highly specific, and verified places — including hidden gems and experiences that locals actually visit and love, not just mainstream tourist traps.
Ensure that every place name, landmark, and restaurant name is REAL and geographically accurate.
Use INR (₹) for costs. Recommend local transport methods (auto, metro, local bus, train, taxi). Mention nearby authentic street food / regional delicacies where relevant.
Always respond in strict JSON only. Do not include markdown fences, preambles, or commentary outside the JSON structure.`;

/** Helper to query user preferences (swipes) and build custom context for prompts */
async function getUserPreferenceContext(supabaseClient: any, userId: string): Promise<string> {
  try {
    const { data: sig } = await supabaseClient
      .from("preference_signals")
      .select("tag, signal")
      .eq("user_id", userId)
      .limit(200);

    if (!sig || sig.length === 0) return "";

    const weights = new Map<string, number>();
    for (const r of sig) {
      weights.set(r.tag, (weights.get(r.tag) ?? 0) + Number(r.signal));
    }

    // Identify tags the user swiped right on
    const likes = Array.from(weights.entries())
      .filter(([_, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 8);

    // Identify tags the user swiped left on
    const dislikes = Array.from(weights.entries())
      .filter(([_, w]) => w < 0)
      .sort((a, b) => a[1] - b[1])
      .map(([t]) => t)
      .slice(0, 8);

    let context = "";
    if (likes.length > 0) {
      context += `User likes & prefers features/places matching: ${likes.join(", ")}. `;
    }
    if (dislikes.length > 0) {
      context += `User dislikes & wants to avoid: ${dislikes.join(", ")}. `;
    }
    return context;
  } catch (e) {
    console.error("[AI Personalization] Failed to fetch user preferences:", e);
    return "";
  }
}

/** -------------- Itinerary generator -------------- */
const ItineraryInput = z.object({
  city: z.string().min(2).max(80),
  hours: z.number().min(1).max(24),
  budget: z.number().min(100).max(200000),
  vibe: z.string().min(2).max(60),
  interests: z.array(z.string()).max(20).default([]),
  weather: z.string().max(60).optional(),
});

export const generateItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ItineraryInput.parse(input))
  .handler(async ({ data, context }) => {
    const prefContext = await getUserPreferenceContext(context.supabase, context.userId);
    const prompt = `Plan a ${data.hours}-hour micro-trip in ${data.city}.
Budget: ₹${data.budget} per person. Vibe: ${data.vibe}.
Interests: ${data.interests.join(", ") || "general"}.
${prefContext ? `Personalized Preference Profile: ${prefContext}` : ""}
${data.weather ? `Weather: ${data.weather}. Avoid open-air spots if rainy/extreme heat.` : ""}

Return JSON:
{
  "title": "short catchy plan title",
  "summary": "1-2 sentence overview",
  "total_cost": number (INR estimate),
  "stops": [
    { "time": "10:00 AM", "name": "Place", "category": "food|sight|nature|culture|shopping|photo|cafe|nightlife",
      "duration_min": number, "cost": number, "why": "one line why it fits", "tip": "local insider tip" }
  ],
  "packing_tip": "1 short line"
}
Generate 4-7 stops in realistic geographic order. Ensure all stop names are actual real locations in ${data.city}.`;

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.8,
    });
    const plan = extractJson<Itinerary>(raw);

    // Save trip
    const { data: trip, error } = await context.supabase
      .from("trips")
      .insert({
        user_id: context.userId,
        title: plan.title,
        city: data.city,
        budget: data.budget,
        hours: data.hours,
        vibe: data.vibe,
        plan: plan as unknown as JsonValue,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return trip as unknown as Record<string, JsonValue>;
  });

/** -------------- Hidden gems -------------- */
const GemsInput = z.object({
  city: z.string().min(2).max(80),
  interests: z.array(z.string()).max(20).default([]),
  count: z.number().min(3).max(12).default(8),
});

export const generateHiddenGems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GemsInput.parse(input))
  .handler(async ({ data, context }) => {
    const prefContext = await getUserPreferenceContext(context.supabase, context.userId);
    const prompt = `List ${data.count} REAL HIDDEN GEMS in or near ${data.city} that most tourists miss but locals love.
Match these interests: ${data.interests.join(", ") || "varied"}.
${prefContext ? `Personalized Preference Profile: ${prefContext}` : ""}
Avoid the top 3 most-famous landmarks of the city. Prefer lesser-known cafes, viewpoints, alleys, villages, art spots, food joints.

Return JSON: { "gems": [
  { "name": "...", "category": "food|nature|culture|photo|cafe|viewpoint|art|adventure",
    "description": "2 short sentences detailing what makes this place special",
    "hidden_gem_score": 60-99,
    "popularity_score": 5-60,
    "insta_score": 1-100,
    "local_score": 1-100,
    "tourist_score": 1-100,
    "best_time": "e.g. 6-8 AM or sunset",
    "approx_cost": INR number,
    "tags": ["tag1","tag2"] }
] }`;

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.9,
    });
    const out = extractJson<{ gems: Gem[] }>(raw);
    return out;
  });

/** -------------- Discovery feed -------------- */
const FeedInput = z.object({
  city: z.string().min(2).max(80),
  interests: z.array(z.string()).max(20).default([]),
});

export const generateDiscoveryFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeedInput.parse(input))
  .handler(async ({ data, context }) => {
    const prefContext = await getUserPreferenceContext(context.supabase, context.userId);
    const prompt = `Generate a swipe-style discovery feed for a traveler in ${data.city}.
Interests: ${data.interests.join(", ") || "varied"}.
${prefContext ? `Personalized Preference Profile: ${prefContext}` : ""}
Mix 8 cards: a few hidden gems, a couple iconic spots, a street food spot, a viewpoint, a cafe.
Each card should feel like a TikTok-style hook.
Important: Ensure the 'name' is the clean, actual name of the place (not a description) so it can be matched with maps/images.

Return JSON: { "cards": [
  { "name": "...", "city": "${data.city}", "category": "...",
    "description": "1 punchy hook sentence + 1 detail sentence",
    "hidden_gem_score": 1-100, "popularity_score": 1-100,
    "insta_score": 1-100, "local_score": 1-100, "tourist_score": 1-100,
    "best_time": "...", "approx_cost": INR, "tags": ["..."] }
] }`;

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.95,
    });
    const parsed = extractJson<{ cards: DiscoveryCard[] }>(raw);

    // Cache to discoveries table
    if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      const rows = parsed.cards.slice(0, 12).map((c) => ({
        name: String(c.name ?? ""),
        city: data.city,
        category: c.category ? String(c.category) : null,
        description: c.description ? String(c.description) : null,
        hidden_gem_score: Number(c.hidden_gem_score ?? 70),
        popularity_score: Number(c.popularity_score ?? 50),
        insta_score: Number(c.insta_score ?? 70),
        local_score: Number(c.local_score ?? 70),
        tourist_score: Number(c.tourist_score ?? 50),
        best_time: c.best_time ? String(c.best_time) : null,
        approx_cost: c.approx_cost ? Number(c.approx_cost) : null,
        tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
        created_by: context.userId,
      }));
      await context.supabase.from("discoveries").insert(rows);
    }
    return parsed;
  });

/** -------------- Travel chat assistant -------------- */
const ChatInput = z.object({
  message: z.string().min(1).max(2000),
  context_city: z.string().max(80).optional(),
});

export const askTravelAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const prefContext = await getUserPreferenceContext(context.supabase, context.userId);
    const raw = await callLovableAI({
      messages: [
        {
          role: "system",
          content: `You are PRISM — a friend who has travelled every corner of India and now lives to help other travellers.
Talk like a person, not a chatbot. Warm, direct, a little playful. No "As an AI…", no lecture tone, no bullet-list dumps unless the user clearly wants a list.
Default reply is 2–4 short paragraphs, first line = the actual answer (the recommendation, the verdict, the number), then a couple of lines of why + one insider tip. If it fits in one line, keep it one line.
Be specific: suggest real places, neighbourhoods, ₹ costs, exact times of day, exact transport (auto / metro line / IRCTC train no. / bus). If you're unsure, say so plainly and give the best guess.
You cover everything a traveller in India needs: hidden gems, day plans, crowd/weather calls, budget hacks, street food, scams to dodge, safety for solo / women / LGBTQ / families, permits, festivals, connectivity, packing, altitude / heat / monsoon / wildlife survival basics, and emergency numbers (police 100, ambulance 108, women 1091, tourist 1363).
When the user is stuck ("I'm bored", "what now"), commit to ONE clear pick first, then 1–2 backups.
${prefContext ? `Keep the user's historical preferences in mind when chatting: ${prefContext}` : ""}
Never invent a source; never mention that you're an AI unless directly asked. Use ₹ and metric units. Small use of emoji is fine (max 1–2 per reply).`,
        },
        {
          role: "user",
          content: data.context_city
            ? `[I'm in ${data.context_city}] ${data.message}`
            : data.message,
        },
      ],
      temperature: 0.7,
    });
    return { reply: raw };
  });

/** -------------- "What now?" Smart Assistant -------------- */
type NowCard = {
  name: string;
  category?: string;
  pitch: string;
  why_now: string;
  distance_km?: number;
  duration_min?: number;
  approx_cost?: number;
  best_time?: string;
  tags?: string[];
  scores: {
    match: number;
    crowd: number;
    budget: number;
    distance: number;
    weather: number;
    overall: number;
  };
};
type NowResponse = {
  headline: string;
  context_note: string;
  primary: NowCard;
  alternatives: NowCard[];
};

const NowInput = z.object({
  city: z.string().min(2).max(80),
  hours_available: z.number().min(0.5).max(12),
  budget: z.number().min(50).max(50000),
  vibe: z.string().max(60).optional(),
  interests: z.array(z.string()).max(20).default([]),
  mood: z.string().max(200).optional(),
  weather: z.string().max(60).optional(),
  local_time: z.string().max(40).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const whatNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NowInput.parse(input))
  .handler(async ({ data, context }) => {
    const prefContext = await getUserPreferenceContext(context.supabase, context.userId);
    const locLine =
      data.lat && data.lng ? `User coords: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}.` : "";
    const prompt = `The user is in ${data.city}${data.local_time ? ` at ${data.local_time}` : ""}.
${locLine}
They have ${data.hours_available} hour(s) free and a budget of ₹${data.budget}.
Vibe: ${data.vibe ?? "open"}. Interests: ${data.interests.join(", ") || "varied"}.
${prefContext ? `Personalized Preference Profile: ${prefContext}` : ""}
${data.mood ? `Mood right now: "${data.mood}".` : ""}
${data.weather ? `Weather: ${data.weather}. Avoid open-air spots if rainy/extreme heat.` : ""}

Decide the single best thing they should do NEXT, plus 6 diverse alternatives (mix categories: food, nature, culture, cafe, viewpoint, art, nightlife, adventure — don't repeat the same category twice where possible).
Favor specific, named places real Indians would suggest. Ensure place 'name' fields are clean, actual names (not descriptions).

Scoring rubric (1-100 each, then "overall" is your weighted blend):
- match: fit to interests + mood + vibe
- crowd: lower = more crowded, higher = peaceful right now (consider time of day, weekend)
- budget: 100 if comfortably under budget, lower if it eats most of budget
- distance: 100 if walkable/very close, lower the farther
- weather: 100 if perfect for current weather, lower if risky

Return STRICT JSON:
{
  "headline": "punchy 5-9 word answer like 'Catch sunset at Besant Nagar beach'",
  "context_note": "one short line acknowledging their context (time, weather, mood)",
  "primary": {
    "name": "...", "category": "food|nature|culture|cafe|photo|viewpoint|art|shopping|nightlife|adventure",
    "pitch": "one punchy sentence — why this is THE answer right now",
    "why_now": "one sentence — why THIS moment (time/weather/mood) makes it perfect",
    "distance_km": number, "duration_min": number, "approx_cost": number,
    "best_time": "...", "tags": ["..."],
    "scores": { "match": 1-100, "crowd": 1-100, "budget": 1-100, "distance": 1-100, "weather": 1-100, "overall": 1-100 }
  },
  "alternatives": [ { ...same shape, EXACTLY 6 items, each spanning a different category, lower overall than primary... } ]
}`;

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.85,
    });

    const parsed = extractJson<NowResponse>(raw);
    const primary = parsed?.primary ?? {
      name: `Explore ${data.city}`,
      category: "nature",
      pitch: `Discover the top local sights, parks, and street food in ${data.city}.`,
      why_now: `Great moment to head out and explore ${data.city}.`,
      distance_km: 2.0,
      duration_min: 90,
      approx_cost: Math.min(data.budget, 200),
      best_time: "Now",
      tags: ["sightseeing", "explore"],
      scores: { match: 90, crowd: 75, budget: 90, distance: 85, weather: 88, overall: 88 },
    };

    return {
      headline: parsed?.headline || `Discover the best of ${data.city} right now`,
      context_note:
        parsed?.context_note || `Tailored for ${data.city} with ${data.hours_available}h free.`,
      primary,
      alternatives:
        Array.isArray(parsed?.alternatives) && parsed.alternatives.length > 0
          ? parsed.alternatives
          : [
              {
                name: `${data.city} Heritage Cafe`,
                category: "cafe",
                pitch: "Relax with local filter coffee and snacks.",
                why_now: "Quiet ambiance and cozy seating.",
                distance_km: 1.5,
                duration_min: 45,
                approx_cost: 150,
                best_time: "Now",
                tags: ["cafe", "coffee"],
                scores: {
                  match: 85,
                  crowd: 80,
                  budget: 95,
                  distance: 90,
                  weather: 95,
                  overall: 85,
                },
              },
            ],
    };
  });

/** -------------- AI Story Mode -------------- */
const StoryInput = z.object({
  city: z.string().min(2).max(80),
  hours: z.number().min(1).max(24).default(6),
  vibe: z.string().max(60).optional(),
  interests: z.array(z.string()).max(20).default([]),
});

export const generateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StoryInput.parse(i))
  .handler(async ({ data, context }) => {
    const prefContext = await getUserPreferenceContext(context.supabase, context.userId);
    const prompt = `Write a warm, cinematic day-in-the-life STORY (2nd person, "you") for a traveler spending ${data.hours} hours in ${data.city}.
Vibe: ${data.vibe ?? "open"}. Interests: ${data.interests.join(", ") || "varied"}.
${prefContext ? `Personalized Preference Profile: ${prefContext}` : ""}
Weave 4-6 real named places into a flowing narrative — mornings, midday, golden hour, night.
Include sensory detail (smells, sounds, food), local transport moves (auto, metro, walk), and INR costs.

Return JSON:
{
  "title": "poetic title",
  "chapters": [
    { "time": "7:30 AM", "heading": "The morning hush", "place": "Actual place", "body": "2-4 vivid sentences", "cost": INR number, "tip": "one line" }
  ],
  "closing": "1-2 line ending"
}`;
    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.95,
    });
    return extractJson<{
      title: string;
      chapters: Array<{
        time: string;
        heading: string;
        place: string;
        body: string;
        cost?: number;
        tip?: string;
      }>;
      closing: string;
    }>(raw);
  });

/** -------------- Nearby Intelligence -------------- */
const NearbyInput = z.object({
  city: z.string().min(2).max(80),
  categories: z
    .array(
      z.enum([
        "cafe",
        "restroom",
        "atm",
        "petrol",
        "hospital",
        "police",
        "parking",
        "hotel",
        "pharmacy",
        "metro",
      ]),
    )
    .default([]),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const nearbyIntel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NearbyInput.parse(i))
  .handler(async ({ data, context }) => {
    const cats = data.categories.length
      ? data.categories.join(", ")
      : "cafe, atm, restroom, hospital, metro, parking";
    const loc =
      data.lat && data.lng ? `Near coords ${data.lat.toFixed(3)}, ${data.lng.toFixed(3)}.` : "";
    const prefContext = await getUserPreferenceContext(context.supabase, context.userId);
    const prompt = `List realistic NEARBY essentials for a traveler in ${data.city}. ${loc}
Categories: ${cats}. For each, suggest 2-3 named/likely spots with rough distance and a practical note.
${prefContext ? `Keep in mind: ${prefContext}` : ""}

Return JSON: { "items": [
  { "category": "cafe|atm|restroom|hospital|police|parking|hotel|petrol|pharmacy|metro",
    "name": "...", "distance_km": number, "note": "short practical tip",
    "open_now_guess": "likely open|likely closed|unknown" }
] }`;
    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.6,
    });
    return extractJson<{
      items: Array<{
        category: string;
        name: string;
        distance_km: number;
        note: string;
        open_now_guess: string;
      }>;
    }>(raw);
  });

/** -------------- Budget Planner -------------- */
const BudgetInput = z.object({
  city: z.string().min(2).max(80),
  days: z.number().min(1).max(30),
  total_budget: z.number().min(500).max(1000000),
  style: z.string().max(40).default("balanced"),
  travelers: z.number().min(1).max(20).default(1),
});

export const budgetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BudgetInput.parse(i))
  .handler(async ({ data }) => {
    const prompt = `Break down a realistic INR budget for ${data.travelers} traveler(s) in ${data.city} for ${data.days} day(s), total ₹${data.total_budget}. Style: ${data.style}.
Return JSON:
{
  "per_day": number,
  "breakdown": [
    { "category": "Stay|Food|Transport|Activities|Shopping|Buffer", "amount": number, "percent": number, "note": "1 line real recommendation with named example" }
  ],
  "tips": ["3-5 short money-saving tips specific to ${data.city}"],
  "warnings": ["1-2 realistic warnings if budget is tight"]
}`;
    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.6,
    });
    return extractJson<{
      per_day: number;
      breakdown: Array<{ category: string; amount: number; percent: number; note: string }>;
      tips: string[];
      warnings: string[];
    }>(raw);
  });

/** -------------- Safety brief -------------- */
const SafetyInput = z.object({
  city: z.string().min(2).max(80),
  profile: z.string().max(60).default("solo traveler"),
});

export const safetyBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SafetyInput.parse(i))
  .handler(async ({ data }) => {
    const prompt = `Give a practical SAFETY brief for a ${data.profile} in ${data.city}, India.
Return JSON:
{
  "overall_score": 1-100,
  "verdict": "safe|caution|avoid",
  "day_score": 1-100, "night_score": 1-100,
  "top_risks": ["3-5 short specific risks like 'auto meter tampering near central station'"],
  "do": ["4-5 concrete dos"],
  "dont": ["4-5 concrete donts"],
  "safe_zones": ["3 named neighborhoods that are generally safer"],
  "avoid_zones": ["2-3 named areas to avoid after dark"],
  "emergency": { "police": "100", "ambulance": "108", "women_helpline": "1091", "tourist_helpline": "1363" }
}`;
    const raw = await callLovableAI({
      messages: [
        { role: "system", content: SYSTEM_INDIA },
        { role: "user", content: prompt },
      ],
      responseJson: true,
      temperature: 0.5,
    });
    return extractJson<{
      overall_score: number;
      verdict: string;
      day_score: number;
      night_score: number;
      top_risks: string[];
      do: string[];
      dont: string[];
      safe_zones: string[];
      avoid_zones: string[];
      emergency: Record<string, string>;
    }>(raw);
  });
