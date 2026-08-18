import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Clock, IndianRupee, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { generateItinerary } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/plan")({
  component: PlanPage,
});

type Stop = {
  time: string;
  name: string;
  category?: string;
  duration_min?: number;
  cost?: number;
  why?: string;
  tip?: string;
};
type Plan = {
  title: string;
  summary?: string;
  total_cost?: number;
  stops: Stop[];
  packing_tip?: string;
};

function PlanPage() {
  const fn = useServerFn(generateItinerary);
  const [city, setCity] = useState("");
  const [hours, setHours] = useState(4);
  const [budget, setBudget] = useState(1000);
  const [vibe, setVibe] = useState("Adventure");
  const [extras, setExtras] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setCity(data.current_city ?? "");
        setBudget(data.budget_per_day ?? 1000);
        setVibe(data.travel_style ?? "Adventure");
      }
    })();
  }, []);

  async function generate() {
    if (!city) return toast.error("Add a city first");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", u.user!.id)
        .maybeSingle();
      const trip = await fn({
        data: {
          city,
          hours,
          budget,
          vibe,
          interests: profile?.interests ?? [],
          weather: extras || undefined,
        },
      });
      setPlan(trip.plan as Plan);
      toast.success("Itinerary ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Plan a micro-trip">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>City / area</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Jibhi or Chennai"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vibe</Label>
              <Input value={vibe} onChange={(e) => setVibe(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hours available</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Budget (₹)</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Anything else? (weather, mood, must-do)</Label>
              <Textarea
                rows={2}
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
                placeholder="It's raining; I love spicy food"
              />
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="mt-4 w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Crafting your plan…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate itinerary
              </>
            )}
          </Button>
        </div>

        {plan && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{plan.title}</h2>
                {plan.summary && (
                  <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
                )}
              </div>
              {typeof plan.total_cost === "number" && (
                <div className="rounded-xl bg-accent px-3 py-2 text-center text-accent-foreground">
                  <div className="text-[10px] uppercase tracking-wider">Total</div>
                  <div className="flex items-center gap-0.5 text-base font-semibold">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {plan.total_cost}
                  </div>
                </div>
              )}
            </div>

            <ol className="mt-5 space-y-3">
              {(plan?.stops ?? []).map((s, i) => (
                <li key={i} className="relative rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {s.time}
                      {s.duration_min ? <span>· {s.duration_min} min</span> : null}
                    </div>
                    {typeof s.cost === "number" && (
                      <span className="text-xs font-medium">₹{s.cost}</span>
                    )}
                  </div>
                  <div className="mt-1.5 font-semibold">{s.name}</div>
                  {s.why && <p className="mt-1 text-sm text-muted-foreground">{s.why}</p>}
                  {s.tip && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-secondary">
                      <Lightbulb className="mt-0.5 h-3 w-3" />
                      {s.tip}
                    </p>
                  )}
                </li>
              ))}
            </ol>

            {plan.packing_tip && (
              <div className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Packing tip:</span> {plan.packing_tip}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
