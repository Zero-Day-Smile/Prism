import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  CloudRain,
  Sun,
  Wind,
  Snowflake,
  Cloud,
  Thermometer,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/weather")({
  component: WeatherPage,
});

type Cat = "rain" | "heat" | "cold" | "clear";
const SWAPS: Record<Cat, { avoid: string[]; swap_to: { name: string; why: string }[] }> = {
  rain: {
    avoid: ["Beach", "Open viewpoint", "Street market walk"],
    swap_to: [
      { name: "Café with a view", why: "Dry, cozy, still photogenic." },
      { name: "Museum / gallery", why: "AC + culture while it pours." },
      { name: "Indoor food court", why: "Sample 6 cuisines in one roof." },
    ],
  },
  heat: {
    avoid: ["Midday beach", "Trekking trail", "Temple courtyard at noon"],
    swap_to: [
      { name: "Sunset viewpoint at 6PM", why: "Same magic, half the heat." },
      { name: "Mall / cinema", why: "AC reset before the evening plan." },
      { name: "Shaded heritage walk", why: "Old town alleys stay cool." },
    ],
  },
  cold: {
    avoid: ["Late-night outdoor", "Riverfront walk past 10PM"],
    swap_to: [
      { name: "Hot chai stall", why: "Local warm-up + people watching." },
      { name: "Cozy bookshop café", why: "Indoor, slow, perfect for cold." },
    ],
  },
  clear: {
    avoid: [],
    swap_to: [
      { name: "Sunset viewpoint", why: "Clear sky → best light of the day." },
      { name: "Rooftop café", why: "Open-air without weather risk." },
      { name: "Street food trail", why: "Walk the lanes while it's perfect." },
    ],
  },
};

function detect(text: string): Cat {
  const t = text.toLowerCase();
  if (/(rain|drizzle|storm|wet|monsoon)/.test(t)) return "rain";
  if (/(hot|heat|humid|sweat|scorch)/.test(t)) return "heat";
  if (/(cold|chilly|freezing|snow)/.test(t)) return "cold";
  return "clear";
}

const ICONS: Record<"rain" | "heat" | "cold" | "clear", typeof Sun> = {
  rain: CloudRain,
  heat: Thermometer,
  cold: Snowflake,
  clear: Sun,
};

// Open-Meteo WMO weather code → short label
function codeToDesc(code: number): string {
  if ([0].includes(code)) return "clear sky";
  if ([1, 2].includes(code)) return "mostly clear";
  if ([3].includes(code)) return "overcast";
  if ([45, 48].includes(code)) return "foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([66, 67].includes(code)) return "freezing rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  return "mixed";
}

function WeatherPage() {
  const [city, setCity] = useState("Chennai");
  const [desc, setDesc] = useState("light rain, 27°C");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<{
    temp: number;
    wind: number;
    label: string;
    humidity?: number;
  } | null>(null);
  const cat = detect(desc);
  const Icon = ICONS[cat];
  const plan = SWAPS[cat];

  async function fetchLive() {
    if (!city.trim()) return;
    setLoading(true);
    try {
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      ).then((r) => r.json());
      const g = geo?.results?.[0];
      if (!g) throw new Error(`Couldn't find "${city}"`);
      const w = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,
      ).then((r) => r.json());
      const c = w?.current;
      if (!c) throw new Error("No weather data");
      const label = codeToDesc(c.weather_code);
      setLive({
        temp: Math.round(c.temperature_2m),
        wind: Math.round(c.wind_speed_10m),
        label,
        humidity: c.relative_humidity_2m,
      });
      setDesc(`${label}, ${Math.round(c.temperature_2m)}°C`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Weather fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLive(); /* auto-fetch on mount */ /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  return (
    <AppShell title="Weather Intelligence">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Live weather → activity swaps</h2>
              <p className="text-xs text-muted-foreground">
                Real-time from Open-Meteo. Rain → café. Heat → indoor.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLive()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchLive} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Current (override)</Label>
              <Input
                placeholder="e.g. light rain, 27°C"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>
          {live && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>🌡 {live.temp}°C</span>
              <span>💧 {live.humidity}%</span>
              <span>💨 {live.wind} km/h</span>
              <span className="capitalize">☁ {live.label}</span>
              <span className="text-primary">Live · Open-Meteo</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border-2 border-primary bg-card p-5 shadow-[var(--shadow-glow)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">PRISM read</p>
              <h3 className="text-2xl font-bold capitalize">
                {cat === "clear" ? "Clear skies" : cat}
              </h3>
              <p className="text-xs text-muted-foreground">
                {city} · {desc}
              </p>
            </div>
            <Icon className="h-12 w-12 text-primary" />
          </div>
        </div>

        {plan.avoid.length > 0 && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <Wind className="h-4 w-4" /> Avoid right now
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {plan.avoid.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">PRISM suggests instead</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {plan.swap_to.map((s) => (
              <div key={s.name} className="rounded-xl border border-border bg-background p-4">
                <h4 className="font-semibold">{s.name}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{s.why}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
