import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Brain, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/memory")({
  component: MemoryPage,
});

type Saved = {
  id: string;
  name: string;
  city: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
};

function MemoryPage() {
  const [items, setItems] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("saved_places")
        .select("id, name, city, category, description, created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Saved[]);
      setLoading(false);
    })();
  }, []);

  const categoryCounts = items.reduce<Record<string, number>>((acc, x) => {
    const k = x.category ?? "other";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topCats = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const cities = [...new Set(items.map((i) => i.city).filter(Boolean))];

  return (
    <AppShell title="Travel Memory">
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
              <h2 className="font-semibold">What PRISM has learned about you</h2>
              <p className="text-xs text-muted-foreground">
                Every save sharpens future recommendations.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Saved" value={items.length} />
            <Stat label="Cities" value={cities.length} />
            <Stat label="Categories" value={Object.keys(categoryCounts).length} />
          </div>

          {topCats.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Your top vibes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topCats.map(([c, n]) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c} · {n}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Recently saved</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing saved yet. Swipe ❤️ on the feed and PRISM starts learning.
            </p>
          ) : (
            items.map((i) => (
              <div key={i.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h4 className="truncate font-medium">{i.name}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      {i.city ?? "—"} · {i.category ?? "other"}
                    </p>
                    {i.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {i.description}
                      </p>
                    )}
                  </div>
                  <Heart className="h-4 w-4 shrink-0 fill-primary text-primary" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
