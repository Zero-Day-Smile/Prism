import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";

export const Route = createFileRoute("/modules")({
  head: () => ({
    meta: [
      { title: "Modules — PRISM" },
      {
        name: "description",
        content:
          "The 13 modules of PRISM — every wavelength of context refracted into your next move.",
      },
      { property: "og:title", content: "Modules — PRISM" },
      {
        property: "og:description",
        content: "All 13 modules of the Personalized Recommendation & Intelligent Smart Model.",
      },
    ],
  }),
  component: ModulesPage,
});

const MODS = [
  [
    "1",
    "Smart Traveler Profile",
    "K-Means clustering + user embeddings. Output: Explorer · Foodie · Photographer · Backpacker · Luxury · Adventure.",
  ],
  [
    "2",
    "Hidden Gems Engine",
    "Score = Interest Match + Rating − Popularity. Local secrets beat famous lists.",
  ],
  [
    "3",
    "AI Travel Feed",
    "Instagram × Google Maps × Netflix recs. Swipe-style cards with match %.",
  ],
  [
    "4",
    "Activity Prediction",
    "Collaborative filtering / matrix factorization. People who liked X also visited Y.",
  ],
  [
    "5",
    "Crowd Prediction",
    "Random Forest (MVP) → XGBoost / LSTM. Inputs: weather, weekend, holiday, hour, events.",
  ],
  ["6", "Smart Itinerary Generator", "Micro-trips: hour-by-hour plan within budget × time × vibe."],
  ["7", "Weather Intelligence", "Rain → swap beach for café. Heat → swap noon for sunset. Auto."],
  ["8", "Budget Intelligence", "Strict ₹ filter. Street food beats fine dining if budget says so."],
  [
    "9",
    "Smart Route Optimization",
    "Shortest × least-traffic × lowest-cost path through your stops.",
  ],
  [
    "10",
    "Travel Chat Assistant",
    '"I\'m bored." → context-aware concrete recommendation in one reply.',
  ],
  ["11", "Similar Traveler Matching", "User similarity via embeddings. Find your taste twins."],
  ["12", "Travel Memory System", "Learns from saved, skipped, visited. Sharper recs every week."],
  ["13", "Discovery Score", "Match · Crowd · Budget · Distance · Weather → one weighted ranking."],
];

function ModulesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <Link to="/auth">
          <Button size="sm">Try PRISM</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <div className="text-center">
          <Layers className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            The 13 modules of{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-prism)" }}
            >
              PRISM
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Each module is a wavelength of context. Refracted together, they answer one question.
          </p>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2">
          {MODS.map(([n, name, body]) => (
            <div
              key={n}
              className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur transition hover:border-primary hover:shadow-[var(--shadow-glow)]"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl font-bold text-primary">
                  {n.padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold">{name}</h3>
              </div>
              <p className="mt-2 pl-9 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
