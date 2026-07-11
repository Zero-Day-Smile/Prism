import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Heart, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/trips")({
  component: TripsPage,
});

type Trip = {
  id: string;
  title: string;
  city: string;
  budget: number | null;
  hours: number | null;
  created_at: string;
};
type Saved = {
  id: string;
  name: string;
  city: string | null;
  category: string | null;
  description: string | null;
  hidden_gem_score: number | null;
};

function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [tr, sv] = await Promise.all([
      supabase
        .from("trips")
        .select("id,title,city,budget,hours,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("saved_places")
        .select("id,name,city,category,description,hidden_gem_score")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false }),
    ]);
    setTrips(tr.data ?? []);
    setSaved(sv.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function delTrip(id: string) {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      refresh();
    }
  }
  async function delSaved(id: string) {
    const { error } = await supabase.from("saved_places").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      refresh();
    }
  }

  if (loading)
    return (
      <AppShell title="Your trips">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );

  return (
    <AppShell title="Your trips">
      <div className="space-y-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Generated itineraries
            </h2>
            <Link to="/app/plan">
              <Button size="sm">New plan</Button>
            </Link>
          </div>
          {trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No trips yet.{" "}
              <Link to="/app/plan" className="text-primary underline">
                Generate your first
              </Link>
              .
            </div>
          ) : (
            <ul className="space-y-3">
              {trips.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                >
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {t.city}
                      {t.hours ? <span>· {t.hours}h</span> : null}
                      {t.budget ? <span>· ₹{t.budget}</span> : null}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => delTrip(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Heart className="h-3.5 w-3.5" /> Saved places
          </h2>
          {saved.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Swipe right on cards in{" "}
              <Link to="/app/discover" className="text-primary underline">
                Discover
              </Link>{" "}
              to save them here.
            </div>
          ) : (
            <ul className="space-y-3">
              {saved.map((s) => (
                <li key={s.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {s.category}
                        {s.city ? ` · ${s.city}` : ""}
                      </div>
                      <div className="mt-0.5 font-semibold">{s.name}</div>
                      {s.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => delSaved(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
