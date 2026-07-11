import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Sparkles, Heart, TrendingUp, Trophy, Compass } from "lucide-react";
import { TravelBackground } from "@/components/travel-background";

export const Route = createFileRoute("/_authenticated/app/insights")({ component: InsightsPage });

type Stats = {
  cities: number;
  trips: number;
  saved: number;
  gems: number;
  signals: number;
  topTag: string | null;
  topCity: string | null;
  streak: number;
};

function InsightsPage() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;
      const [trips, saved, signals] = await Promise.all([
        supabase.from("trips").select("city, created_at").eq("user_id", uid),
        supabase
          .from("saved_places")
          .select("city, hidden_gem_score, created_at")
          .eq("user_id", uid),
        supabase.from("preference_signals").select("tag, signal, created_at").eq("user_id", uid),
      ]);
      const cities = new Set<string>();
      trips.data?.forEach((t) => t.city && cities.add(t.city));
      saved.data?.forEach((r) => r.city && cities.add(r.city));
      const cityCount = new Map<string, number>();
      [...(trips.data ?? []), ...(saved.data ?? [])].forEach(
        (r) => r.city && cityCount.set(r.city, (cityCount.get(r.city) ?? 0) + 1),
      );
      const topCity = [...cityCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const tagCount = new Map<string, number>();
      signals.data?.forEach((r) => {
        if (r.signal > 0) tagCount.set(r.tag, (tagCount.get(r.tag) ?? 0) + r.signal);
      });
      const topTag = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const gems = saved.data?.filter((r) => (r.hidden_gem_score ?? 0) >= 70).length ?? 0;
      // streak: consecutive days with any activity
      const days = new Set<string>();
      [...(trips.data ?? []), ...(saved.data ?? []), ...(signals.data ?? [])].forEach(
        (r: { created_at: string }) => days.add(r.created_at.slice(0, 10)),
      );
      let streak = 0;
      const d = new Date();
      while (days.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }

      setS({
        cities: cities.size,
        trips: trips.data?.length ?? 0,
        saved: saved.data?.length ?? 0,
        gems,
        signals: signals.data?.length ?? 0,
        topTag,
        topCity,
        streak,
      });
    })();
  }, []);

  if (!s)
    return (
      <AppShell title="Insights">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );

  const cards = [
    { icon: MapPin, label: "Cities explored", v: s.cities, tint: "from-fuchsia-500 to-violet-600" },
    { icon: Sparkles, label: "Trips generated", v: s.trips, tint: "from-amber-400 to-orange-600" },
    { icon: Heart, label: "Places saved", v: s.saved, tint: "from-pink-500 to-rose-500" },
    { icon: Compass, label: "Hidden gems found", v: s.gems, tint: "from-emerald-400 to-teal-600" },
    { icon: TrendingUp, label: "Brain signals", v: s.signals, tint: "from-cyan-400 to-sky-600" },
    { icon: Trophy, label: "Day streak", v: s.streak, tint: "from-yellow-400 to-amber-600" },
  ];

  return (
    <AppShell title="Travel Insights">
      <TravelBackground variant="subtle" />
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {cards.map((c, i) => (
            <div
              key={c.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className={`mb-2 inline-grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${c.tint} text-white`}
              >
                <c.icon className="h-4 w-4" />
              </div>
              <div className="text-3xl font-bold tabular-nums">{c.v}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Favorite city
            </div>
            <div
              className="mt-1 text-2xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-prism)" }}
            >
              {s.topCity ?? "—"}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Top interest (learned)
            </div>
            <div
              className="mt-1 text-2xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-prism)" }}
            >
              {s.topTag ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
