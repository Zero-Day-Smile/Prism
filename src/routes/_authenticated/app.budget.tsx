import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, IndianRupee, Wallet, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { budgetPlan } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { TravelBackground } from "@/components/travel-background";

export const Route = createFileRoute("/_authenticated/app/budget")({ component: BudgetPage });

type Plan = {
  per_day: number;
  breakdown: Array<{ category: string; amount: number; percent: number; note: string }>;
  tips: string[];
  warnings: string[];
};

function BudgetPage() {
  const fn = useServerFn(budgetPlan);
  const [city, setCity] = useState("");
  const [days, setDays] = useState(3);
  const [total, setTotal] = useState(6000);
  const [travelers, setTravelers] = useState(1);
  const [style, setStyle] = useState("balanced");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("current_city, budget_per_day")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data?.current_city) setCity(data.current_city);
      if (data?.budget_per_day) setTotal(data.budget_per_day * 3);
    })();
  }, []);

  async function run() {
    if (!city) return toast.error("Enter a city");
    setLoading(true);
    try {
      setPlan(await fn({ data: { city, days, total_budget: total, style, travelers } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Budget">
      <TravelBackground variant="subtle" />
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Budget planner</h2>
              <p className="text-xs text-muted-foreground">
                Break down your ₹ across stay, food, transport, activities.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Days</Label>
              <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total budget (₹)</Label>
              <Input
                type="number"
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Travelers</Label>
              <Input
                type="number"
                value={travelers}
                onChange={(e) => setTravelers(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Style</Label>
              <div className="flex flex-wrap gap-1.5">
                {["shoestring", "balanced", "comfort", "luxury"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`rounded-full px-3 py-1 text-xs ${style === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={run} disabled={loading} className="mt-4 w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Crunching…
              </>
            ) : (
              "Plan my budget"
            )}
          </Button>
        </div>

        {plan && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Per day, per traveler (approx)
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-3xl font-bold">
                <IndianRupee className="h-6 w-6" />
                {plan.per_day.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              {(plan?.breakdown ?? []).map((b, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 animate-in fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{b.category}</div>
                    <div className="text-sm">
                      <span className="font-semibold">₹{b.amount.toLocaleString()}</span>{" "}
                      <span className="text-xs text-muted-foreground">({b.percent}%)</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, b.percent)}%`,
                        background: "var(--gradient-prism)",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{b.note}</p>
                </div>
              ))}
            </div>
            {(plan?.tips ?? []).length > 0 && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Lightbulb className="h-3 w-3" /> Money tips
                </div>
                <ul className="space-y-1 text-sm">
                  {(plan?.tips ?? []).map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>
            )}
            {(plan?.warnings ?? []).length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> Heads up
                </div>
                <ul className="space-y-1 text-sm">
                  {(plan?.warnings ?? []).map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
