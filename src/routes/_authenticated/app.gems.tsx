import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  MapPinned,
  Sparkles,
  Heart,
  Clock,
  IndianRupee,
  Navigation2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { generateHiddenGems } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { directionsUrl, photoUrl, openExternal, fetchIpLocation } from "@/lib/place-utils";

export const Route = createFileRoute("/_authenticated/app/gems")({
  component: GemsPage,
});

type Gem = {
  name: string;
  category?: string;
  description?: string;
  hidden_gem_score?: number;
  popularity_score?: number;
  insta_score?: number;
  local_score?: number;
  tourist_score?: number;
  best_time?: string;
  approx_cost?: number;
  tags?: string[];
};

function GemsPage() {
  const fn = useServerFn(generateHiddenGems);
  const [city, setCity] = useState("Chennai");
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("current_city")
        .eq("id", u.user!.id)
        .maybeSingle();
      if (data?.current_city) setCity(data.current_city);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
          async () => {
            const ipLoc = await fetchIpLocation();
            if (ipLoc) setCoords({ lat: ipLoc.lat, lng: ipLoc.lng });
          },
          { timeout: 4000 },
        );
      } else {
        const ipLoc = await fetchIpLocation();
        if (ipLoc) setCoords({ lat: ipLoc.lat, lng: ipLoc.lng });
      }
      // Auto-load initial gems for current city
      load();
    })();
  }, []);

  async function load() {
    if (!city) return toast.error("Enter a city");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", u.user!.id)
        .maybeSingle();
      const res = await fn({ data: { city, interests: profile?.interests ?? [], count: 8 } });
      setGems(res?.gems ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function save(g: Gem) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("saved_places").insert({
      user_id: u.user!.id,
      name: g.name,
      city,
      category: g.category ?? null,
      description: g.description ?? null,
      hidden_gem_score: g.hidden_gem_score ?? null,
    });
    if (error) toast.error(error.message);
    else toast.success(`Saved ${g.name}`);
  }

  return (
    <AppShell title="Hidden gems">
      <div className="space-y-5">
        <div className="flex gap-2">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City — e.g. Jaipur"
          />
          <Button onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>

        {gems.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <MapPinned className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Discover under-the-radar spots locals love.
          </div>
        )}

        <ul className="space-y-3">
          {gems.map((g, i) => (
            <li
              key={i}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
            >
              <div
                className="h-32 w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${photoUrl(g.name, city, 800, 400)}), var(--gradient-sunset)`,
                }}
              />
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {g.category}{" "}
                    {g.tags?.slice(0, 2).map((t) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-1 font-semibold">{g.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{g.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {g.best_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {g.best_time}
                      </span>
                    )}
                    {typeof g.approx_cost === "number" && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {g.approx_cost}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 gap-1 text-xs"
                      onClick={() => openExternal(directionsUrl(g.name, city, coords))}
                    >
                      <Navigation2 className="h-3 w-3" /> Directions
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        openExternal(
                          `https://www.youtube.com/results?search_query=${encodeURIComponent(`${g.name} ${city} vlog`)}`,
                        )
                      }
                    >
                      <Youtube className="h-3 w-3" /> Videos
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="rounded-xl bg-accent px-2.5 py-1.5 text-center text-accent-foreground">
                    <div className="text-[9px] uppercase tracking-wider">Gem</div>
                    <div className="text-base font-bold leading-none">{g.hidden_gem_score}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={() => save(g)}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
