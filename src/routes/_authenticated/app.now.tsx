import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { whatNow } from "@/lib/ai.functions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Cloud,
  MapPin,
  Clock,
  IndianRupee,
  Heart,
  Crosshair,
  Navigation2,
} from "lucide-react";
import { directionsUrl, openExternal, fetchIpLocation } from "@/lib/place-utils";
import { FormattedText } from "@/components/formatted-text";

export const Route = createFileRoute("/_authenticated/app/now")({
  component: NowPage,
});

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

function NowPage() {
  const ask = useServerFn(whatNow);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [vibe, setVibe] = useState<string>("Adventure");
  const [hours, setHours] = useState(3);
  const [budget, setBudget] = useState(800);
  const [mood, setMood] = useState("");
  const [weather, setWeather] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NowResponse | null>(null);

  const localTime = useMemo(
    () =>
      new Date().toLocaleString("en-IN", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    [result],
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      if (p) {
        setCity(p.current_city ?? "");
        setInterests(p.interests ?? []);
        setVibe(p.travel_style ?? "Adventure");
        if (p.budget_per_day) setBudget(Math.min(p.budget_per_day, 5000));
      }
      setProfileLoaded(true);
      // Auto-fetch initial recommendations on page load
      setTimeout(() => {
        go();
      }, 50);
    })();
  }, []);

  async function useMyLocation() {
    const fallback = async (msg: string) => {
      toast.info("HTML5 Geolocation unavailable. Trying IP-based location...");
      const ipLoc = await fetchIpLocation();
      if (ipLoc) {
        setCoords({ lat: ipLoc.lat, lng: ipLoc.lng });
        if (ipLoc.city) setCity(ipLoc.city);
        toast.success(`Locked to ${ipLoc.city} (IP-based)`);
      } else {
        toast.error(`${msg}. IP-based lookup failed too.`);
      }
    };

    if (!("geolocation" in navigator)) {
      await fallback("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location locked in");
      },
      async (err) => {
        await fallback(err.message || "Couldn't get location");
      },
      { timeout: 8000 },
    );
  }

  async function go() {
    if (!city.trim()) return toast.error("Add a city (or save it in your profile)");
    setLoading(true);
    setResult(null);
    try {
      const res = (await ask({
        data: {
          city: city.trim(),
          hours_available: hours,
          budget,
          vibe,
          interests,
          mood: mood || undefined,
          weather: weather || undefined,
          local_time: localTime,
          lat: coords?.lat,
          lng: coords?.lng,
        },
      })) as NowResponse;
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get a suggestion");
    } finally {
      setLoading(false);
    }
  }

  async function save(card: NowCard) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("saved_places").insert({
      user_id: u.user.id,
      name: card.name,
      city,
      category: card.category ?? null,
      description: `${card.pitch} — ${card.why_now}`,
      hidden_gem_score: card.scores.overall,
    });
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  if (!profileLoaded)
    return (
      <AppShell title="What now?">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );

  return (
    <AppShell title="What should I do next?">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Tell me your moment</h2>
              <p className="text-xs text-muted-foreground">
                {localTime} • AI ranks the best next move for you.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Where are you?
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Chennai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={useMyLocation}
                  title="Use my location"
                >
                  <Crosshair className="h-4 w-4" />
                </Button>
              </div>
              {coords && (
                <p className="text-[10px] text-muted-foreground">
                  📍 {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" /> Weather (optional)
              </Label>
              <Input
                placeholder="sunny, light rain, hot…"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Time free
                </span>
                <span className="text-xs text-muted-foreground">{hours}h</span>
              </Label>
              <Slider
                value={[hours]}
                min={1}
                max={10}
                step={0.5}
                onValueChange={(v) => setHours(v[0])}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" /> Budget
                </span>
                <span className="text-xs text-muted-foreground">₹{budget}</span>
              </Label>
              <Slider
                value={[budget]}
                min={100}
                max={5000}
                step={50}
                onValueChange={(v) => setBudget(v[0])}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>How are you feeling? (optional)</Label>
              <Input
                placeholder="bored, energetic, hungry, want quiet…"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              />
            </div>
          </div>

          {interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-1 self-center">Using:</span>
              {interests.slice(0, 8).map((i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {i}
                </Badge>
              ))}
            </div>
          )}

          <Button onClick={go} disabled={loading} className="mt-5 w-full" size="lg">
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? "Reading the room…" : "Tell me what to do next"}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-5 text-primary-foreground shadow-[var(--shadow-soft)]"
              style={{ background: "var(--gradient-warm)" }}
            >
              <p className="text-[11px] uppercase tracking-wider opacity-80">Your next move</p>
              <h3 className="mt-1 text-2xl font-bold leading-tight">{result.headline}</h3>
              <p className="mt-2 text-sm opacity-90">
                <FormattedText text={result.context_note} />
              </p>
            </div>

            <PrimaryCard
              card={result.primary}
              city={city}
              coords={coords}
              onSave={() => save(result.primary)}
            />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Or instead…</h4>
              <div className="grid gap-3">
                {result.alternatives?.map((c, i) => (
                  <AltCard key={i} card={c} city={city} coords={coords} onSave={() => save(c)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function PrimaryCard({
  card,
  city,
  coords,
  onSave,
}: {
  card: NowCard;
  city: string;
  coords: { lat: number; lng: number } | null;
  onSave: () => void;
}) {
  const scores = card?.scores ?? {
    overall: 85,
    match: 85,
    crowd: 80,
    budget: 90,
    distance: 85,
    weather: 90,
  };

  return (
    <div className="rounded-2xl border-2 border-primary bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{card.name}</h3>
            {card.category && (
              <Badge variant="secondary" className="text-[10px]">
                {card.category}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm"><FormattedText text={card.pitch} /></p>
          <p className="mt-2 text-xs italic text-muted-foreground">⏱ <FormattedText text={card.why_now} /></p>
        </div>
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-primary-foreground"
          style={{ background: "var(--gradient-warm)" }}
        >
          <div className="text-center leading-none">
            <div className="text-lg font-bold">{scores.overall}</div>
            <div className="text-[8px] opacity-80">MATCH</div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {card.distance_km !== undefined && <span>📍 {card.distance_km} km</span>}
        {card.duration_min !== undefined && <span>⏱ {card.duration_min} min</span>}
        {card.approx_cost !== undefined && <span>₹{card.approx_cost}</span>}
        {card.best_time && <span>🕐 {card.best_time}</span>}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        <ScoreBar label="Match" value={scores.match} />
        <ScoreBar label="Crowd" value={scores.crowd} />
        <ScoreBar label="Budget" value={scores.budget} />
        <ScoreBar label="Distance" value={scores.distance} />
        <ScoreBar label="Weather" value={scores.weather} />
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={onSave} className="flex-1">
          <Heart className="mr-2 h-4 w-4" /> Save
        </Button>
        <Button
          variant="outline"
          onClick={() => openExternal(directionsUrl(card.name, city, coords))}
        >
          <Navigation2 className="mr-2 h-4 w-4" /> Directions
        </Button>
      </div>
    </div>
  );
}

function AltCard({
  card,
  city,
  coords,
  onSave,
}: {
  card: NowCard;
  city: string;
  coords: { lat: number; lng: number } | null;
  onSave: () => void;
}) {
  const scores = card?.scores ?? { overall: 75 };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-semibold">{card.name}</h4>
            {card.category && (
              <Badge variant="outline" className="text-[10px]">
                {card.category}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.pitch}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {card.approx_cost !== undefined && <span>₹{card.approx_cost}</span>}
            {card.duration_min !== undefined && <span>⏱ {card.duration_min}m</span>}
            {card.distance_km !== undefined && <span>📍 {card.distance_km}km</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => openExternal(directionsUrl(card.name, city, coords))}
              className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20"
            >
              <Navigation2 className="h-3 w-3" /> Directions
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Heart className="h-3 w-3" /> Save
            </button>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-primary">{scores.overall}</div>
          <div className="text-[8px] uppercase text-muted-foreground">match</div>
        </div>
      </div>
    </div>
  );
}
