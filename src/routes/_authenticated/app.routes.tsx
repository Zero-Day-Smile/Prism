import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Route as RouteIcon,
  GripVertical,
  Trash2,
  Plus,
  Clock,
  IndianRupee,
  MapPin,
  Navigation2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { geocode, directionsUrl, openExternal } from "@/lib/place-utils";

export const Route = createFileRoute("/_authenticated/app/routes")({
  component: RoutePage,
});

type Stop = { id: string; name: string; lat: number; lng: number; cost: number };

const SEED: Stop[] = [
  { id: "a", name: "Café Amudham", lat: 13.06, lng: 80.27, cost: 250 },
  { id: "b", name: "Marina Sunset", lat: 13.05, lng: 80.28, cost: 0 },
  { id: "c", name: "Mylapore Temple", lat: 13.03, lng: 80.27, cost: 50 },
  { id: "d", name: "Besant Nagar Beach", lat: 12.99, lng: 80.27, cost: 100 },
];

function haversine(a: Stop, b: Stop) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function tspGreedy(stops: Stop[]) {
  if (stops.length <= 1) return stops;
  const remaining = [...stops];
  const ordered: Stop[] = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestI = 0,
      bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = haversine(last, s);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    ordered.push(remaining.splice(bestI, 1)[0]);
  }
  return ordered;
}

function summarize(stops: Stop[]) {
  let km = 0;
  for (let i = 1; i < stops.length; i++) km += haversine(stops[i - 1], stops[i]);
  const minutes = Math.round(km * 4 + stops.length * 30); // 4 min/km city + 30 min/stop
  const cost = stops.reduce((s, x) => s + x.cost, 0) + Math.round(km * 15); // ₹15/km auto
  return { km: Math.round(km * 10) / 10, minutes, cost };
}

function RoutePage() {
  const [stops, setStops] = useState<Stop[]>(SEED);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const original = useMemo(() => summarize(stops), [stops]);
  const optimized = useMemo(() => tspGreedy(stops), [stops]);
  const optSummary = useMemo(() => summarize(optimized), [optimized]);
  const saved = original.km - optSummary.km;

  async function add() {
    const n = name.trim();
    if (!n) return;
    setAdding(true);
    try {
      const g = await geocode(n);
      if (!g) {
        toast.error(`Couldn't find "${n}" — try adding the city name.`);
        return;
      }
      setStops((s) => [
        ...s,
        {
          id: crypto.randomUUID(),
          name: g.display.split(",").slice(0, 2).join(",").trim(),
          lat: g.lat,
          lng: g.lng,
          cost: 100 + Math.round(Math.random() * 300),
        },
      ]);
      setName("");
      toast.success(`Added ${n}`);
    } finally {
      setAdding(false);
    }
  }

  function openOptimizedInMaps() {
    if (optimized.length < 2) return;
    const origin = `${optimized[0].lat},${optimized[0].lng}`;
    const dest = `${optimized[optimized.length - 1].lat},${optimized[optimized.length - 1].lng}`;
    const waypoints = optimized
      .slice(1, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join("|");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
    openExternal(url);
  }

  return (
    <AppShell title="Smart Route Optimization">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <RouteIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Optimize for time × distance × cost</h2>
              <p className="text-xs text-muted-foreground">
                Greedy nearest-neighbor TSP. Auto fare ₹15/km, 4 min/km city traffic.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Add a stop — e.g. India Gate Delhi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} disabled={adding}>
              {adding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}{" "}
              Add
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Geocoded via OpenStreetMap — real coordinates, real distances.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Plan
            title="Your order"
            stops={stops}
            sum={original}
            onRemove={(id) => setStops(stops.filter((s) => s.id !== id))}
          />
          <Plan title="PRISM optimized" stops={optimized} sum={optSummary} accent />
        </div>

        {saved > 0 && (
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4 text-center text-sm">
            <strong className="text-primary">{saved.toFixed(1)} km</strong> saved ·{" "}
            <strong className="text-primary">{original.minutes - optSummary.minutes} min</strong>{" "}
            faster · <strong className="text-primary">₹{original.cost - optSummary.cost}</strong>{" "}
            cheaper
          </div>
        )}
        {optimized.length >= 2 && (
          <Button className="w-full" size="lg" onClick={openOptimizedInMaps}>
            <Navigation2 className="mr-2 h-4 w-4" /> Open optimized route in Google Maps
          </Button>
        )}
      </div>
    </AppShell>
  );
}

function Plan({
  title,
  stops,
  sum,
  accent,
  onRemove,
}: {
  title: string;
  stops: Stop[];
  sum: { km: number; minutes: number; cost: number };
  accent?: boolean;
  onRemove?: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-4 ${accent ? "border-primary shadow-[var(--shadow-glow)]" : "border-border"}`}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <ol className="mt-3 space-y-1.5">
        {stops.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm"
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono text-primary">{i + 1}</span>
            <span className="flex-1 truncate">{s.name}</span>
            <span className="text-[10px] text-muted-foreground">₹{s.cost}</span>
            {onRemove && (
              <button onClick={() => onRemove(s.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex justify-between border-t border-border pt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {sum.km} km
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {sum.minutes} min
        </span>
        <span className="flex items-center gap-1">
          <IndianRupee className="h-3 w-3" /> {sum.cost}
        </span>
      </div>
    </div>
  );
}
