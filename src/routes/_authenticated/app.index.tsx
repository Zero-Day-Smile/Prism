import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Compass,
  MapPinned,
  Zap,
  MessageSquare,
  CloudRain,
  Users,
  Brain,
  BarChart3,
  Route as RouteIcon,
  Heart,
} from "lucide-react";
import { TravelBackground } from "@/components/travel-background";
import { BrainPanel } from "@/components/brain-panel";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppHome,
});

const INTEREST_OPTIONS = [
  "Food",
  "Street Food",
  "Cafes",
  "Photography",
  "Nature",
  "Hiking",
  "Adventure",
  "Beaches",
  "Culture",
  "Temples",
  "Art",
  "Markets",
  "Nightlife",
  "Shopping",
  "Quiet Places",
  "Viewpoints",
];

const VIBES = ["Peaceful", "Adventure", "Luxury", "Workation", "Family", "Solo"];

function AppHome() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState(1000);
  const [vibe, setVibe] = useState("Adventure");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile) {
        setFullName(profile.full_name ?? "");
        setCity(profile.current_city ?? "");
        setBudget(profile.budget_per_day ?? 1000);
        setVibe(profile.travel_style ?? "Adventure");
        setInterests(profile.interests ?? []);
      }
      setLoading(false);
    })();
  }, []);

  function toggle(i: string) {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: u.user.id,
      full_name: fullName,
      current_city: city,
      budget_per_day: budget,
      travel_style: vibe,
      interests,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  if (loading)
    return (
      <AppShell title="Welcome">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );

  return (
    <AppShell title={fullName ? `Namaste, ${fullName.split(" ")[0]}` : "Welcome to PRISM"}>
      <TravelBackground variant="subtle" />
      <div className="space-y-6">
        <Link
          to="/app/now"
          className="group relative block overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-[var(--shadow-glow)] transition hover:scale-[1.01] animate-prism-shimmer"
          style={{ background: "var(--gradient-prism)" }}
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl animate-prism-float" />
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider opacity-80">One tap</p>
              <h2 className="text-lg font-bold leading-tight">What should I do next?</h2>
              <p className="text-xs opacity-90">
                PRISM refracts your time, budget, mood & weather — picks your next move.
              </p>
            </div>
          </div>
        </Link>

        <BrainPanel />

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Your travel profile</h2>
              <p className="text-xs text-muted-foreground">
                The better we know you, the better the AI gets.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Your name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Current city</Label>
              <Input
                placeholder="e.g. Chennai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Daily budget (₹)</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Travel style</Label>
              <div className="flex flex-wrap gap-1.5">
                {VIBES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVibe(v)}
                    className={`rounded-full px-3 py-1 text-xs transition ${vibe === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((i) => {
                const on = interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"}`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="mt-5 w-full">
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            All PRISM modules
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                to: "/app/plan",
                icon: Sparkles,
                t: "Plan a micro-trip",
                b: "Hour-by-hour AI plan.",
              },
              {
                to: "/app/discover",
                icon: Compass,
                t: "Swipe the feed",
                b: "Cards tuned to your vibe.",
              },
              { to: "/app/gems", icon: MapPinned, t: "Hidden gems", b: "Skip the tourist traps." },
              {
                to: "/app/chat",
                icon: MessageSquare,
                t: "Travel chat",
                b: '"I\'m bored." Try it.',
              },
              {
                to: "/app/crowd",
                icon: BarChart3,
                t: "Crowd prediction",
                b: "Best time to visit.",
              },
              { to: "/app/weather", icon: CloudRain, t: "Weather intel", b: "Rain? PRISM swaps." },
              {
                to: "/app/routes",
                icon: RouteIcon,
                t: "Smart routes",
                b: "Cost · time · traffic.",
              },
              {
                to: "/app/similar",
                icon: Users,
                t: "Similar travelers",
                b: "Find your taste twins.",
              },
              { to: "/app/memory", icon: Heart, t: "Travel memory", b: "Learns from you." },
              { to: "/app/score", icon: BarChart3, t: "Discovery Score", b: "How PRISM ranks." },
              { to: "/app/profile", icon: Brain, t: "Traveler profile", b: "Your taste cluster." },
              { to: "/app/trips", icon: Heart, t: "Trips", b: "Your saved plans." },
            ].map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-[var(--shadow-glow)]"
              >
                <m.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{m.t}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{m.b}</p>
              </Link>
            ))}
          </div>
        </div>

        {interests.length > 0 && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tuned for:</span>{" "}
            {interests.slice(0, 6).map((i) => (
              <Badge key={i} variant="secondary" className="mr-1">
                {i}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
