import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Camera, Utensils, Mountain, Sparkles, Backpack, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfileClusterPage,
});

const CLUSTERS = [
  {
    id: "explorer",
    label: "Explorer",
    icon: Sparkles,
    signals: ["Adventure", "Hiking", "Viewpoints", "Nature"],
    blurb:
      "You're after the unknown corners. PRISM will push hidden gems and skip the famous list.",
  },
  {
    id: "foodie",
    label: "Foodie",
    icon: Utensils,
    signals: ["Food", "Street Food", "Cafes", "Markets"],
    blurb: "Plates over places. PRISM will route every plan through one great meal.",
  },
  {
    id: "photographer",
    label: "Photographer",
    icon: Camera,
    signals: ["Photography", "Viewpoints", "Nature", "Culture"],
    blurb: "Light-chaser. PRISM will time things around golden hour and quiet frames.",
  },
  {
    id: "backpacker",
    label: "Backpacker",
    icon: Backpack,
    signals: ["Adventure", "Hiking", "Quiet Places"],
    blurb: "Cheap, deep, raw. PRISM will keep things under-budget and off the bus route.",
  },
  {
    id: "luxury",
    label: "Luxury Traveler",
    icon: Crown,
    signals: ["Shopping", "Nightlife", "Cafes"],
    blurb: "Comfort first. PRISM will pick AC, indoor, and well-rated every time.",
  },
  {
    id: "adventurer",
    label: "Adventure Seeker",
    icon: Mountain,
    signals: ["Adventure", "Hiking", "Beaches"],
    blurb: "Adrenaline > AC. PRISM will lean into trails, treks, and water.",
  },
];

function ProfileClusterPage() {
  const [interests, setInterests] = useState<string[]>([]);
  const [vibe, setVibe] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("interests, travel_style")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setInterests(data.interests ?? []);
        setVibe(data.travel_style ?? "");
      }
    })();
  }, []);

  const ranked = useMemo(() => {
    const I = new Set(interests.map((i) => i.toLowerCase()));
    return CLUSTERS.map((c) => {
      const hits = c.signals.filter((s) => I.has(s.toLowerCase())).length;
      const vibeBoost = vibe && c.label.toLowerCase().includes(vibe.toLowerCase()) ? 1 : 0;
      return { ...c, score: hits + vibeBoost };
    }).sort((a, b) => b.score - a.score);
  }, [interests, vibe]);

  const primary = ranked[0];
  const PI = primary.icon;

  return (
    <AppShell title="Traveler Profile">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">K-Means cluster → your traveler archetype</h2>
              <p className="text-xs text-muted-foreground">
                PRISM embeds your interests + vibe, then snaps you to the nearest cluster.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-[var(--shadow-glow)]">
          <div className="flex items-center gap-4">
            <div
              className="grid h-16 w-16 place-items-center rounded-2xl text-primary-foreground"
              style={{ background: "var(--gradient-prism)" }}
            >
              <PI className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">You are</p>
              <h3 className="text-2xl font-bold">{primary.label}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{primary.blurb}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Cluster distances (lower-rank = closer)</h3>
          {ranked.slice(1).map((c) => {
            const I = c.icon;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <I className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{c.label}</span>
                <Badge variant="outline" className="text-[10px]">
                  {c.score} signals
                </Badge>
              </div>
            );
          })}
        </div>

        {interests.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Add interests on your home screen to refine the cluster.
          </p>
        )}
      </div>
    </AppShell>
  );
}
