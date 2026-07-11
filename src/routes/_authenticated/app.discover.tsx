import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Heart,
  X,
  Sparkles,
  MapPin,
  IndianRupee,
  Clock,
  Users,
  Brain,
  Youtube,
  Info,
  Navigation2,
} from "lucide-react";
import { toast } from "sonner";
import { generateDiscoveryFeed } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { directionsUrl, photoUrl, openExternal, fetchIpLocation } from "@/lib/place-utils";

export const Route = createFileRoute("/_authenticated/app/discover")({
  component: DiscoverPage,
});

type Card = {
  name: string;
  city?: string;
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
  _crowd?: number;
  _match?: number;
  _rank?: number;
  _image?: string;
  _wiki?: string;
  _extract?: string;
};

// Fetch Wikipedia thumbnail + summary for a place name (public API, no key).
async function enrichFromWiki(
  name: string,
  city?: string,
): Promise<{ image?: string; extract?: string; wiki?: string }> {
  try {
    const q = encodeURIComponent(`${name}${city ? ` ${city}` : ""}`);
    const s = await fetch(
      `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${q}&limit=1`,
    ).then((r) => r.json());
    const key = s?.pages?.[0]?.key;
    if (!key) return {};
    const sum = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`,
    ).then((r) => r.json());
    return {
      image: sum?.thumbnail?.source || sum?.originalimage?.source,
      extract: sum?.extract,
      wiki: sum?.content_urls?.desktop?.page,
    };
  } catch {
    return {};
  }
}

function DiscoverPage() {
  const fn = useServerFn(generateDiscoveryFeed);
  const [city, setCity] = useState("Chennai");
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [weights, setWeights] = useState<Map<string, number>>(new Map());
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [exiting, setExiting] = useState<null | "left" | "right">(null);
  const [showInfo, setShowInfo] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
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
      // Fetch PRISM learned weights per tag
      const { data: sig } = await supabase
        .from("preference_signals")
        .select("tag, signal")
        .eq("user_id", u.user.id)
        .limit(500);
      const m = new Map<string, number>();
      for (const r of sig ?? []) {
        m.set(r.tag, (m.get(r.tag) ?? 0) + Number(r.signal));
      }
      setWeights(m);
    })();
  }, []);

  function rank(cards: Card[]): Card[] {
    const scored = cards.map((c) => {
      // Crowd prediction: higher popularity => more crowded => lower peace score
      const crowd = Math.max(0, Math.min(100, 100 - (c.popularity_score ?? 50)));
      // Match: learned tag weights sum + category weight
      const tags = new Set<string>();
      if (c.category) tags.add(c.category.toLowerCase());
      (c.tags ?? []).forEach((t) => tags.add(String(t).toLowerCase()));
      let match = 0;
      tags.forEach((t) => {
        match += (weights.get(t) ?? 0) * 8;
      });
      match = Math.max(-40, Math.min(60, match));
      const rank = crowd * 0.4 + (c.hidden_gem_score ?? 60) * 0.3 + match * 0.6;
      return { ...c, _crowd: crowd, _match: match, _rank: rank };
    });
    return scored.sort((a, b) => (b._rank ?? 0) - (a._rank ?? 0));
  }

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
      const res = await fn({ data: { city, interests: profile?.interests ?? [] } });
      const ranked = rank(res.cards as Card[]);
      setCards(ranked);
      setIdx(0);
      // Enrich in background — images populate as they arrive.
      ranked.forEach((c, i) => {
        enrichFromWiki(c.name, c.city ?? city).then((info) => {
          if (!info.image && !info.extract) return;
          setCards((prev) => {
            const next = [...prev];
            if (next[i] && next[i].name === c.name)
              next[i] = {
                ...next[i],
                _image: info.image,
                _extract: info.extract,
                _wiki: info.wiki,
              };
            return next;
          });
        });
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function save(c: Card) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("saved_places").insert({
      user_id: u.user!.id,
      name: c.name,
      city: c.city ?? city,
      category: c.category ?? null,
      description: c.description ?? null,
      hidden_gem_score: c.hidden_gem_score ?? null,
    });
    if (error) toast.error(error.message);
    else toast.success(`Saved ${c.name} — Brain learned +1`);
    await recordSignals(c, +1);
    setIdx((i) => i + 1);
  }

  async function skip(c: Card) {
    await recordSignals(c, -1);
    toast("Skipped — Brain noted", { description: `We'll show less like "${c.name}"` });
    setIdx((i) => i + 1);
  }

  async function recordSignals(c: Card, signal: 1 | -1) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const tags = new Set<string>();
    if (c.category) tags.add(c.category.toLowerCase());
    (c.tags ?? []).forEach((t) => tags.add(String(t).toLowerCase()));
    if (tags.size === 0) return;
    const rows = [...tags].map((tag) => ({
      user_id: u.user!.id,
      tag,
      signal,
      source: "discover",
      place_name: c.name,
    }));
    await supabase.from("preference_signals").insert(rows);
  }

  const current = cards[idx];
  useEffect(() => {
    setShowInfo(false);
  }, [idx]);

  function handlePointerDown(e: React.PointerEvent) {
    if (!current || exiting) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    pointerIdRef.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0 });
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  }
  function handlePointerUp() {
    if (!drag || !current) {
      startRef.current = null;
      setDrag(null);
      return;
    }
    const threshold = 110;
    if (drag.x > threshold) commitSwipe("right");
    else if (drag.x < -threshold) commitSwipe("left");
    else setDrag(null);
    startRef.current = null;
  }
  function commitSwipe(dir: "left" | "right") {
    setExiting(dir);
    setTimeout(() => {
      const c = current!;
      setExiting(null);
      setDrag(null);
      if (dir === "right") save(c);
      else skip(c);
    }, 220);
  }

  const rotate = drag ? drag.x * 0.06 : 0;
  const translateX = exiting === "right" ? 600 : exiting === "left" ? -600 : (drag?.x ?? 0);
  const translateY = exiting ? 40 : (drag?.y ?? 0) * 0.3;
  const opacity = exiting ? 0 : 1;
  const likeOverlay = Math.max(0, Math.min(1, (drag?.x ?? 0) / 140));
  const nopeOverlay = Math.max(0, Math.min(1, -(drag?.x ?? 0) / 140));
  // Always show an image — Wikipedia if we have it, otherwise a Flickr photo tagged with the place name.
  const heroImage =
    current?._image || (current ? photoUrl(current.name, current.city ?? city) : "");

  return (
    <AppShell title="Discover">
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-primary">
            <Brain className="h-3.5 w-3.5" /> Ranked by PRISM
          </div>
          <div className="text-muted-foreground">
            Learned {weights.size} tag{weights.size === 1 ? "" : "s"} · crowd-aware
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City to explore"
          />
          <Button onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!current && cards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Tap the sparkle to load a feed for {city || "your city"}.
          </div>
        )}

        {!current && cards.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h3 className="font-semibold">You've seen them all.</h3>
            <Button onClick={load} className="mt-4">
              Load more
            </Button>
          </div>
        )}

        {current && (
          <div
            className="relative select-none overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-soft)] touch-none"
            style={{
              transform: `translate(${translateX}px, ${translateY}px) rotate(${exiting ? (exiting === "right" ? 20 : -20) : rotate}deg)`,
              opacity,
              transition:
                drag && !exiting ? "none" : "transform 220ms ease-out, opacity 220ms ease-out",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between p-6">
              <div
                className="rounded-lg border-4 border-emerald-400 px-3 py-1 text-xl font-black uppercase tracking-widest text-emerald-400 rotate-[-12deg]"
                style={{ opacity: likeOverlay }}
              >
                Save
              </div>
              <div
                className="rounded-lg border-4 border-rose-400 px-3 py-1 text-xl font-black uppercase tracking-widest text-rose-400 rotate-[12deg]"
                style={{ opacity: nopeOverlay }}
              >
                Nope
              </div>
            </div>
            <div
              className="relative aspect-[4/5] w-full"
              style={{
                backgroundImage: `url(${heroImage}), var(--gradient-sunset)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="flex h-full flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-white">
                <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
                  {typeof current._crowd === "number" && (
                    <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] backdrop-blur">
                      <Users className="h-3 w-3" />
                      {current._crowd > 60
                        ? "Peaceful now"
                        : current._crowd > 30
                          ? "Moderate"
                          : "Crowded"}
                    </span>
                  )}
                  {typeof current._match === "number" && current._match !== 0 && (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] backdrop-blur ${current._match > 0 ? "bg-emerald-500/30" : "bg-rose-500/30"}`}
                    >
                      <Brain className="h-3 w-3" />
                      {current._match > 0
                        ? `+${current._match.toFixed(0)} match`
                        : `${current._match.toFixed(0)} match`}
                    </span>
                  )}
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-90">
                  {current.category && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                      {current.category}
                    </span>
                  )}
                  {current.tags?.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl font-semibold leading-tight">{current.name}</h2>
                <div className="mt-1 flex items-center gap-1 text-xs opacity-90">
                  <MapPin className="h-3 w-3" />
                  {current.city ?? city}
                </div>
                <p className="mt-3 text-sm opacity-95">{current.description}</p>

                {showInfo && current._extract && (
                  <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-black/40 p-3 text-xs leading-relaxed backdrop-blur">
                    {current._extract}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {current._extract && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInfo((v) => !v);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] backdrop-blur hover:bg-white/30"
                    >
                      <Info className="h-3 w-3" /> {showInfo ? "Hide" : "More info"}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openExternal(directionsUrl(current.name, current.city ?? city, coords));
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur hover:bg-primary"
                  >
                    <Navigation2 className="h-3 w-3" /> Directions
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openExternal(
                        `https://www.youtube.com/results?search_query=${encodeURIComponent(`${current.name} ${current.city ?? city} travel vlog`)}`,
                      );
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-full bg-rose-500/80 px-3 py-1 text-[11px] backdrop-blur hover:bg-rose-500"
                  >
                    <Youtube className="h-3 w-3" /> YouTube
                  </button>
                  {current._wiki && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openExternal(current._wiki!);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="rounded-full bg-white/20 px-3 py-1 text-[11px] backdrop-blur hover:bg-white/30"
                    >
                      Wikipedia →
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider">
                  <ScoreChip
                    label="Insta"
                    v={current.insta_score}
                    hint="Instagram-worthy — how photogenic / trending on socials (0–100)."
                  />
                  <ScoreChip
                    label="Local"
                    v={current.local_score}
                    hint="Locals-love-it — how often residents actually go here."
                  />
                  <ScoreChip
                    label="Hidden"
                    v={current.hidden_gem_score}
                    hint="Hidden-gem score — off-the-beaten-path, low tourist traffic."
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs opacity-90">
                  {current.best_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {current.best_time}
                    </span>
                  )}
                  {typeof current.approx_cost === "number" && (
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {current.approx_cost}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-center gap-4 bg-card p-4"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-14 rounded-full transition hover:scale-110 hover:border-rose-500 hover:text-rose-500"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  skip(current);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className="h-14 w-14 rounded-full transition hover:scale-110"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  save(current);
                }}
              >
                <Heart className="h-5 w-5" />
              </Button>
            </div>
            <div className="px-4 pb-3 text-center text-xs text-muted-foreground">
              {idx + 1} / {cards.length}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ScoreChip({ label, v, hint }: { label: string; v?: number; hint?: string }) {
  if (v == null) return <div />;
  return (
    <div className="rounded-lg bg-white/15 px-2 py-1 backdrop-blur" title={hint}>
      <div className="text-[9px] opacity-80">{label}</div>
      <div className="text-sm font-semibold tracking-normal">{v}</div>
    </div>
  );
}
