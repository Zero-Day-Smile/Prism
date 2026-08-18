import { routeRequest } from "./ai/index.server";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Call the provider-agnostic AI service router, returning the raw assistant text. */
export async function callLovableAI(opts: {
  model?: string;
  messages: ChatMessage[];
  responseJson?: boolean;
  temperature?: number;
}): Promise<string> {
  try {
    const response = await routeRequest({
      messages: opts.messages,
      responseJson: opts.responseJson,
      temperature: opts.temperature,
      model: opts.model,
    });
    return response.content;
  } catch (err) {
    console.error("[AI Gateway] All AI providers failed or quota exceeded:", err);

    if (opts.responseJson) {
      const promptText = opts.messages.map((m) => m.content).join(" ");
      if (promptText.includes("cards") || promptText.includes("DISCOVERY")) {
        return JSON.stringify({
          cards: [
            {
              name: "Besant Nagar Beach & Promenade",
              category: "nature",
              description: "Lively coastal promenade with sea breeze, sunset views, and filter coffee stalls.",
              hidden_gem_score: 88,
              popularity_score: 40,
              insta_score: 90,
              local_score: 95,
              tourist_score: 40,
              best_time: "5:30 PM - 8:00 PM",
              approx_cost: 100,
              tags: ["sunset", "beach", "coffee"],
            },
            {
              name: "Broken Bridge Viewpoint",
              category: "viewpoint",
              description: "Lesser-known spot at the mouth of Adyar river with serene estuary views.",
              hidden_gem_score: 94,
              popularity_score: 25,
              insta_score: 95,
              local_score: 90,
              tourist_score: 15,
              best_time: "6:00 AM or Sunset",
              approx_cost: 0,
              tags: ["photo", "nature", "quiet"],
            },
          ],
        });
      }

      if (promptText.includes("gems") || promptText.includes("HIDDEN GEMS")) {
        return JSON.stringify({
          gems: [
            {
              name: "Semmozhi Poonga Botanical Garden",
              category: "nature",
              description: "Peaceful 20-acre botanical garden tucked away in the city center.",
              hidden_gem_score: 88,
              popularity_score: 30,
              insta_score: 85,
              local_score: 92,
              tourist_score: 20,
              best_time: "7:00 AM - 10:00 AM",
              approx_cost: 50,
              tags: ["nature", "quiet", "walk"],
            },
            {
              name: "Amethyst Cafe & Courtyard",
              category: "cafe",
              description: "Heritage bungalow turned garden cafe surrounded by tropical foliage.",
              hidden_gem_score: 85,
              popularity_score: 45,
              insta_score: 92,
              local_score: 88,
              tourist_score: 35,
              best_time: "4:00 PM - 7:00 PM",
              approx_cost: 400,
              tags: ["cafe", "heritage", "coffee"],
            },
          ],
        });
      }

      if (promptText.includes("NEXT") || promptText.includes("primary")) {
        return JSON.stringify({
          headline: "Unwind at Marina Beach Promenade",
          context_note: "Cool evening breeze and relaxed vibe right now.",
          primary: {
            name: "Marina Beach Sunset Promenade",
            category: "nature",
            pitch: "Longest urban beach in India with sunset colors and fresh filter coffee stalls.",
            why_now: "The evening sea breeze is cooling down and crowds thin out near Valluvar statue.",
            distance_km: 2.5,
            duration_min: 90,
            approx_cost: 80,
            best_time: "5:00 PM - 7:30 PM",
            tags: ["sunset", "beach", "filter-coffee"],
            scores: { match: 92, crowd: 75, budget: 95, distance: 90, weather: 90, overall: 90 },
          },
          alternatives: [],
        });
      }
    }

    return "I am currently running in offline mode. For a quick recommendation, check out Marina Beach promenade at sunset or a local filter coffee spot nearby!";
  }
}

function repairJsonString(raw: string): string {
  let s = raw.trim();

  // Strip code fences
  s = s.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // Strip JS comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

  // Extract from first { or [ to last } or ]
  const firstBrace = s.search(/[\{\[]/);
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  } else if (firstBrace !== -1) {
    s = s.slice(firstBrace);
  }

  // Remove trailing commas before closing braces/brackets
  s = s.replace(/,\s*([}\]])/g, "$1");

  // Fix unquoted property names e.g. { name: "val" } -> { "name": "val" }
  s = s.replace(/(?<=[{\s,])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');

  // Fix unescaped control characters inside strings
  s = s.replace(/[\u0000-\u001F]+/g, (match) => {
    if (match === "\n") return "\\n";
    if (match === "\r") return "\\r";
    if (match === "\t") return "\\t";
    return "";
  });

  // Repair truncated JSON structure by auto-closing string quotes and open brackets/braces
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === "\\") {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
      } else if (char === "}" || char === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    s += '"';
  }

  s = s.replace(/,\s*$/, "");

  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

function createFallbackObject<T>(raw: string): T {
  // If prompt is for Now recommendations
  if (raw.includes("primary") || raw.includes("headline") || raw.includes("NEXT")) {
    return {
      headline: "Explore Top Sights & Local Promenades",
      context_note: "Great time for a scenic walk and local snacks.",
      primary: {
        name: "City Promenade & Sunset Spot",
        category: "nature",
        pitch: "Enjoy a relaxed stroll and try iconic local street food.",
        why_now: "Comfortable atmosphere and great evening breeze right now.",
        distance_km: 1.8,
        duration_min: 60,
        approx_cost: 150,
        best_time: "Now",
        tags: ["walk", "food", "outdoors"],
        scores: { match: 90, crowd: 75, budget: 95, distance: 90, weather: 88, overall: 88 },
      },
      alternatives: [
        {
          name: "Heritage Courtyard Cafe",
          category: "cafe",
          pitch: "Fresh roasted coffee in a historic garden ambiance.",
          why_now: "Cozy spot to unwind with good coffee.",
          distance_km: 2.1,
          duration_min: 45,
          approx_cost: 250,
          best_time: "Now",
          tags: ["coffee", "cafe"],
          scores: { match: 85, crowd: 80, budget: 90, distance: 85, weather: 95, overall: 85 },
        },
      ],
    } as unknown as T;
  }
  // If the prompt requested cards (discovery feed)
  if (raw.includes("cards")) {
    return { cards: [] } as unknown as T;
  }
  // If the prompt requested gems
  if (raw.includes("gems")) {
    return { gems: [] } as unknown as T;
  }
  // If the prompt requested stops (itinerary)
  if (raw.includes("stops") || raw.includes("title")) {
    return { title: "Custom Itinerary", stops: [] } as unknown as T;
  }
  // Generic object fallback
  return {} as T;
}

export function extractJson<T = unknown>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    return createFallbackObject<T>("");
  }

  // 1. Direct JSON parse
  try {
    return JSON.parse(raw) as T;
  } catch {}

  // 2. Self-healing repair parse
  try {
    const repaired = repairJsonString(raw);
    return JSON.parse(repaired) as T;
  } catch {}

  // 3. Regex extraction fallback for object or array
  try {
    const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      const repairedMatch = repairJsonString(jsonMatch[1]);
      return JSON.parse(repairedMatch) as T;
    }
  } catch {}

  console.warn("[extractJson] Unresolvable JSON output from AI. Providing fallback shape. Raw output:", raw.slice(0, 300));
  return createFallbackObject<T>(raw);
}
