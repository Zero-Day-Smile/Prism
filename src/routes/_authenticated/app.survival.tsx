import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Droplet,
  Home as HomeIcon,
  Compass,
  Phone,
  HeartPulse,
  Zap,
  Wifi,
  WifiOff,
  Download,
  TreePine,
  Sun,
  Snowflake,
  Building,
  Search,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { fetchIpLocation } from "@/lib/place-utils";

export const Route = createFileRoute("/_authenticated/app/survival")({
  component: SurvivalPage,
});

type Guide = {
  id: string;
  title: string;
  env: "wild" | "desert" | "mountain" | "urban";
  priority: string[];
  sections: {
    icon: "water" | "shelter" | "food" | "signal" | "first-aid" | "warmth";
    title: string;
    steps: string[];
  }[];
  eatable: string[];
  avoid: string[];
};

// Baked-in, cached offline. Curated from general survival practice.
const GUIDES: Guide[] = [
  {
    id: "wild",
    title: "Lost in the Jungle / Forest",
    env: "wild",
    priority: [
      "Stop moving",
      "Find water within 24h",
      "Build shelter before dark",
      "Signal from a clearing",
    ],
    sections: [
      {
        icon: "shelter",
        title: "Shelter",
        steps: [
          "Pick high, dry ground away from game trails and dead trees ('widow-makers').",
          "Lean 3–4 thick branches against a trunk to make an A-frame; pile leaves 30 cm thick for insulation.",
          "Elevate your bed 10 cm off the ground with logs to stay dry and warm.",
        ],
      },
      {
        icon: "water",
        title: "Water",
        steps: [
          "Head downhill — water pools in valleys. Follow bird calls at dawn.",
          "Collect dew with a cotton cloth pre-dawn; wring into a bottle.",
          "Always boil 1 min (3 min above 2000 m) or use 2 drops chlorine per litre.",
        ],
      },
      {
        icon: "food",
        title: "Food",
        steps: [
          "You can go 3 weeks without food. Do not eat unknown plants.",
          "Safer bets: bananas, coconut, jackfruit, mangoes, guavas, tender bamboo shoots (boil twice).",
          "Insects (grasshoppers, crickets — no bright colours) are 60% protein. Cook them.",
        ],
      },
      {
        icon: "signal",
        title: "Signal for rescue",
        steps: [
          "Three of anything = SOS: 3 fires in a triangle, 3 whistle blasts, 3 mirror flashes.",
          "Green leaves on a fire = white smoke, visible for kilometres.",
          "Stay put once you've built a signal. Movement wastes calories.",
        ],
      },
      {
        icon: "first-aid",
        title: "First aid",
        steps: [
          "Snake bite: stay calm, immobilise the limb below heart level, no tourniquet, no cutting. Get to a hospital.",
          "Leeches: never pull — flick with a fingernail or salt.",
          "Fever + chills in India = suspect malaria/dengue, evacuate.",
        ],
      },
    ],
    eatable: [
      "Bamboo shoots (boiled twice)",
      "Coconut water",
      "Jackfruit",
      "Wild banana",
      "Tender fern fiddleheads (boiled)",
    ],
    avoid: [
      "White berries",
      "Milky sap plants",
      "Yellow/red mushrooms",
      "Anything you can't 100% identify",
    ],
  },
  {
    id: "desert",
    title: "Stranded in the Desert (Thar / Rajasthan)",
    env: "desert",
    priority: [
      "Stay with vehicle",
      "Cover skin, don't drink alcohol",
      "Move only at night",
      "Ration sweat, not water",
    ],
    sections: [
      {
        icon: "water",
        title: "Water first",
        steps: [
          "Drink your water — do NOT ration to the point of dehydration. You lose 1L/hour sweating in 45°C.",
          "Dig 30 cm in a dry riverbed at dawn — moisture often collects.",
          "Solar still: dig a pit, place a cup in centre, cover with plastic weighed in the middle. Yields ~500 ml/day.",
        ],
      },
      {
        icon: "shelter",
        title: "Shade beats sun",
        steps: [
          "Stay under/beside the vehicle — it's your biggest shade + signal.",
          "Build a double-layer shade (car + tarp raised 30 cm above) — 20°C cooler underneath.",
          "Never sit on bare sand at noon — it hits 70°C. Sit on cloth.",
        ],
      },
      {
        icon: "warmth",
        title: "Cold nights",
        steps: [
          "Desert nights drop to 5°C. Bury warm sand under your bed, cover with cloth.",
          "Wear layers — a wool cap saves 30% heat loss.",
        ],
      },
      {
        icon: "signal",
        title: "Signal",
        steps: [
          "SOS in sand: giant letters, 3 m tall, using rocks or dark cloth.",
          "Mirror flash toward horizon every few minutes when awake.",
          "Burn a spare tyre for black smoke — visible 40 km away.",
        ],
      },
      {
        icon: "food",
        title: "Food",
        steps: [
          "Skip food if water is short — digestion needs water.",
          "Edible: date palm fruit, ber (Indian jujube), khejri pods (cooked).",
        ],
      },
    ],
    eatable: ["Ber (jujube)", "Khejri pods (cooked)", "Date palm", "Cactus fruit (peel spines)"],
    avoid: ["Alcohol (dehydrates)", "Salty food without water", "Sugary drinks", "Walking at noon"],
  },
  {
    id: "mountain",
    title: "Stuck in the Mountains (Himalayas / Western Ghats)",
    env: "mountain",
    priority: [
      "Descend if possible",
      "Watch for altitude sickness",
      "Stay dry = stay alive",
      "Build fire before dark",
    ],
    sections: [
      {
        icon: "warmth",
        title: "Warmth",
        steps: [
          "Wet = dead. Change into dry layers immediately. Wool > cotton.",
          "Fire: birch bark, dry moss, pine needles as tinder. Keep matches in a ziplock.",
          "Sleep in fetal position on insulation (pine boughs, backpack) — never directly on snow/stone.",
        ],
      },
      {
        icon: "shelter",
        title: "Snow / cave shelter",
        steps: [
          "Snow cave: dig into a drift, entrance lower than sleeping area (traps warm air).",
          "Rock overhang + tarp windbreak works below the snow line.",
        ],
      },
      {
        icon: "water",
        title: "Water",
        steps: [
          "Melt snow — never eat snow directly (drops core temperature).",
          "Streams above the treeline are usually safe; boil below.",
        ],
      },
      {
        icon: "first-aid",
        title: "AMS (altitude sickness)",
        steps: [
          "Headache + nausea above 2500 m = descend 500 m immediately.",
          "Confusion, wet cough, bluish lips = HAPE/HACE. Get down now, evacuate.",
          "Diamox 125 mg twice daily helps prevention (consult doc).",
        ],
      },
      {
        icon: "signal",
        title: "Signal",
        steps: [
          "International alpine distress: 6 whistle blasts / min, repeat every minute.",
          "Cross of dark clothing on snow visible to helicopters.",
        ],
      },
    ],
    eatable: [
      "Pine nuts",
      "Rhododendron flowers (few, cooked)",
      "Nettles (boiled)",
      "Berries you can 100% ID",
    ],
    avoid: [
      "Yellow snow, glacier melt without boiling",
      "Alcohol (accelerates hypothermia)",
      "Sleeping without insulation",
    ],
  },
  {
    id: "urban",
    title: "Stranded in a City (No Cash / Phone Dead)",
    env: "urban",
    priority: [
      "Get to a police station or railway station",
      "Charge phone at any tea stall (₹0–20)",
      "Sleep in temples / gurdwaras (free, safe)",
    ],
    sections: [
      {
        icon: "shelter",
        title: "Safe sleep for free",
        steps: [
          "Any gurdwara offers free bed + food (langar) — no questions asked. Golden Temple, Bangla Sahib, Sis Ganj.",
          "Railway retiring rooms: ₹150–500 with a valid ticket.",
          "Airport terminals let you sit inside with a printed boarding pass up to 8h before flight.",
        ],
      },
      {
        icon: "food",
        title: "Free / near-free food",
        steps: [
          "Langar (gurdwara): unlimited, 24/7 at large ones.",
          "ISKCON temples serve prasadam at aarti times.",
          "Railway 'Jan Ahaar' meals: ₹20 puri-sabzi, ₹50 thali.",
        ],
      },
      {
        icon: "signal",
        title: "Contact + cash",
        steps: [
          "Any police station will let you call family for free.",
          "Tourist helpline: 1363 (24/7, multi-lingual).",
          "Western Union / MoneyGram at any post office receives cash with just your passport.",
        ],
      },
      {
        icon: "first-aid",
        title: "Medical",
        steps: [
          "Govt hospitals give free emergency care to tourists. Ambulance = 108.",
          "Jan Aushadhi stores sell generics at 80% off.",
        ],
      },
    ],
    eatable: [
      "Langar dal-roti",
      "Temple prasadam",
      "Railway ₹20 thalis",
      "Local mess (₹40–60 unlimited)",
    ],
    avoid: [
      "Unlit alleys after 10pm",
      "Solo autos without meter after dark",
      "Sleeping on beaches (theft)",
    ],
  },
];

const CACHE_KEY = "prism_survival_cache_v1";

function SurvivalPage() {
  const [active, setActive] = useState<Guide>(GUIDES[0]);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [cached, setCached] = useState(false);
  const [query, setQuery] = useState("");
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    try {
      setCached(!!localStorage.getItem(CACHE_KEY));
    } catch {
      /* ignore */
    }
    const detectEnvironment = (lat: number, lng: number) => {
      // Himalayan belt
      if (lat > 28 && lng > 74 && lng < 96) {
        setActive(GUIDES[2]);
        setDetected("Himalayan region — mountain guide loaded");
      }
      // Thar / Rajasthan desert box
      else if (lat > 24 && lat < 30 && lng > 69 && lng < 76) {
        setActive(GUIDES[1]);
        setDetected("Thar region — desert guide loaded");
      }
      // Western/Eastern Ghats & jungle-ish zones
      else if ((lat < 15 && lng < 78) || (lat > 22 && lng > 88)) {
        setActive(GUIDES[0]);
        setDetected("Forest zone — jungle guide loaded");
      } else {
        setActive(GUIDES[3]);
        setDetected("Urban area — city guide loaded");
      }
    };

    // Auto-detect environment from geolocation (very rough — India-centric heuristic).
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          detectEnvironment(p.coords.latitude, p.coords.longitude);
        },
        async () => {
          const ipLoc = await fetchIpLocation();
          if (ipLoc) detectEnvironment(ipLoc.lat, ipLoc.lng);
        },
        { timeout: 6000 },
      );
    } else {
      (async () => {
        const ipLoc = await fetchIpLocation();
        if (ipLoc) detectEnvironment(ipLoc.lat, ipLoc.lng);
      })();
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Full-text search across every guide's steps, priorities, eatable, avoid.
  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as { guide: Guide; matches: string[] }[];
    return GUIDES.map((g) => {
      const hay = [
        ...g.priority,
        ...g.sections.flatMap((s) => [s.title, ...s.steps]),
        ...g.eatable,
        ...g.avoid,
      ];
      const matches = hay.filter((h) => h.toLowerCase().includes(q)).slice(0, 4);
      return { guide: g, matches };
    }).filter((r) => r.matches.length > 0);
  }, [query]);

  function saveOffline() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ guides: GUIDES, savedAt: Date.now() }));
      setCached(true);
      toast.success("Survival guides saved. Works with zero signal now.");
    } catch {
      toast.error("Storage full — clear some cache.");
    }
  }

  const envIcon = { wild: TreePine, desert: Sun, mountain: Snowflake, urban: Building }[active.env];
  const EnvIcon = envIcon;
  const sectionIcon = {
    water: Droplet,
    shelter: HomeIcon,
    food: Flame,
    signal: Zap,
    "first-aid": HeartPulse,
    warmth: Flame,
  };

  return (
    <AppShell title="Survival">
      <div className="space-y-5">
        {/* Offline banner */}
        <div
          className={`flex items-center justify-between rounded-xl border p-3 text-xs ${online ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600" : "border-amber-500/60 bg-amber-500/10 text-amber-600"}`}
        >
          <div className="flex items-center gap-2">
            {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {online ? "Online" : "Offline mode — cached guides only"}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={saveOffline}
            className="h-7 gap-1 text-[11px]"
          >
            <Download className="h-3 w-3" /> {cached ? "Re-cache" : "Save offline"}
          </Button>
        </div>

        {detected && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-primary">
            <MapPin className="h-3 w-3" /> {detected}
          </div>
        )}

        {/* Search anything */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search — "snake bite", "no water", "fire", "shelter"…'
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          {searchHits.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchHits.map(({ guide, matches }) => (
                <button
                  key={guide.id}
                  onClick={() => {
                    setActive(guide);
                    setQuery("");
                  }}
                  className="w-full rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{guide.title.split(" (")[0]}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {matches.length} match{matches.length === 1 ? "" : "es"}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {matches.map((m, i) => (
                      <li key={i} className="line-clamp-1">
                        • {m}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          )}
          {query && searchHits.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              No matches. Try “water”, “fire”, “bite”, “altitude”, “shelter”.
            </p>
          )}
        </div>

        {/* Env picker */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GUIDES.map((g) => {
            const Icon = { wild: TreePine, desert: Sun, mountain: Snowflake, urban: Building }[
              g.env
            ];
            const on = active.id === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setActive(g)}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${on ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
              >
                <Icon className={`h-5 w-5 ${on ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-semibold leading-tight">
                  {g.title.split(" (")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active guide */}
        <div className="rounded-2xl border-2 border-primary bg-card p-5 shadow-[var(--shadow-glow)]">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <EnvIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold leading-tight">{active.title}</h2>
              <p className="text-xs text-muted-foreground">First 4 things you do, in order</p>
            </div>
          </div>
          <ol className="mt-3 space-y-1.5 text-sm">
            {active.priority.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {active.sections.map((s) => {
            const Icon = sectionIcon[s.icon];
            return (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-primary" /> {s.title}
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Eat / avoid */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <h3 className="text-sm font-semibold text-emerald-600">✓ Safe to eat / drink</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {active.eatable.map((e) => (
                <Badge key={e} variant="outline" className="border-emerald-500/50 text-[11px]">
                  {e}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <h3 className="text-sm font-semibold text-destructive">✗ Avoid</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {active.avoid.map((e) => (
                <Badge key={e} variant="outline" className="border-destructive/50 text-[11px]">
                  {e}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency numbers card — always visible, always cached */}
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Phone className="h-4 w-4 text-primary" /> India emergency numbers
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Emerg label="Police" num="100" />
            <Emerg label="Ambulance" num="108" />
            <Emerg label="Women" num="1091" />
            <Emerg label="Tourist" num="1363" />
            <Emerg label="Fire" num="101" />
            <Emerg label="Disaster" num="1078" />
            <Emerg label="Railway" num="139" />
            <Emerg label="Road accident" num="1073" />
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          <Compass className="mr-1 inline h-3 w-3" /> Cached locally — this page works with no
          internet once you tap “Save offline”.
        </p>
      </div>
    </AppShell>
  );
}

function Emerg({ label, num }: { label: string; num: string }) {
  return (
    <a
      href={`tel:${num}`}
      className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 transition hover:border-primary hover:bg-primary/5"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums text-primary">{num}</span>
    </a>
  );
}
