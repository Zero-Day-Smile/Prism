import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Coffee,
  Droplet,
  Landmark,
  Hospital,
  Fuel,
  ParkingSquare,
  Building2,
  Cross,
  TrainFront,
  Shield,
  MapPin,
  Crosshair,
  Navigation2,
} from "lucide-react";
import { toast } from "sonner";
import { nearbyIntel } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { TravelBackground } from "@/components/travel-background";
import { directionsUrl, openExternal, fetchIpLocation } from "@/lib/place-utils";

export const Route = createFileRoute("/_authenticated/app/nearby")({ component: NearbyPage });

const CATS = [
  { id: "cafe", label: "Cafes", icon: Coffee },
  { id: "restroom", label: "Restrooms", icon: Droplet },
  { id: "atm", label: "ATMs", icon: Landmark },
  { id: "hospital", label: "Hospitals", icon: Hospital },
  { id: "police", label: "Police", icon: Shield },
  { id: "petrol", label: "Petrol", icon: Fuel },
  { id: "parking", label: "Parking", icon: ParkingSquare },
  { id: "hotel", label: "Hotels", icon: Building2 },
  { id: "pharmacy", label: "Pharmacy", icon: Cross },
  { id: "metro", label: "Metro", icon: TrainFront },
] as const;

type Cat = (typeof CATS)[number]["id"];
type Item = {
  category: string;
  name: string;
  distance_km: number;
  note: string;
  open_now_guess: string;
  lat?: number;
  lng?: number;
};

function NearbyPage() {
  const fn = useServerFn(nearbyIntel);
  const [city, setCity] = useState("Chennai");
  const [picked, setPicked] = useState<Cat[]>(["cafe", "atm", "restroom", "hospital", "metro"]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data } = await supabase
          .from("profiles")
          .select("current_city")
          .eq("id", u.user.id)
          .maybeSingle();
        if (data?.current_city) setCity(data.current_city);
      }
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
          async () => {
            const ipLoc = await fetchIpLocation();
            if (ipLoc) {
              setCoords({ lat: ipLoc.lat, lng: ipLoc.lng });
              if (ipLoc.city) setCity(ipLoc.city);
            }
          },
          { timeout: 4000 },
        );
      } else {
        const ipLoc = await fetchIpLocation();
        if (ipLoc) {
          setCoords({ lat: ipLoc.lat, lng: ipLoc.lng });
          if (ipLoc.city) setCity(ipLoc.city);
        }
      }
    })();
  }, []);

  async function usePreciseLocation() {
    setLocating(true);

    const fallback = async (msg: string) => {
      toast.info("HTML5 Geolocation unavailable. Trying IP-based location...");
      const ipLoc = await fetchIpLocation();
      setLocating(false);
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
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
        toast.success(`Locked to ±${Math.round(p.coords.accuracy)}m`);
      },
      async (err) => {
        await fallback(err.message || "Couldn't get location");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }

  async function run() {
    if (!city) return toast.error("Enter a city");
    setLoading(true);
    try {
      const res = await fn({
        data: { city, categories: picked, lat: coords?.lat, lng: coords?.lng },
      });
      setItems(res.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: Cat) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <AppShell title="Nearby">
      <TravelBackground variant="subtle" />
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={usePreciseLocation}
              title="Use my precise location"
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan"}
            </Button>
          </div>
          {coords ? (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600">
              <MapPin className="h-3 w-3" /> Precise location on · {coords.lat.toFixed(4)},{" "}
              {coords.lng.toFixed(4)}
            </p>
          ) : (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> Tap the crosshair to enable precise distance &
              directions.
            </p>
          )}
          <div className="mt-3 grid grid-cols-5 gap-2">
            {CATS.map((c) => {
              const on = picked.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] transition ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  <c.icon className="h-4 w-4" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {items.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Pick categories → Scan to see what's around you.
          </div>
        )}

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((it, i) => {
              const Cat = CATS.find((c) => c.id === it.category)?.icon ?? MapPin;
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 animate-in fade-in slide-in-from-bottom-1"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Cat className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{it.name}</div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {it.distance_km.toFixed(1)} km
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{it.note}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-primary/80">
                        {it.open_now_guess}
                      </span>
                      <button
                        onClick={() => openExternal(directionsUrl(it.name, city, coords))}
                        className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                      >
                        <Navigation2 className="h-3 w-3" /> Directions
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
