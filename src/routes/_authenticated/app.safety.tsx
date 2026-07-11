import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, Phone, Sun, Moon, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { safetyBrief } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { TravelBackground } from "@/components/travel-background";

export const Route = createFileRoute("/_authenticated/app/safety")({ component: SafetyPage });

type Brief = {
  overall_score: number;
  verdict: string;
  day_score: number;
  night_score: number;
  top_risks: string[];
  do: string[];
  dont: string[];
  safe_zones: string[];
  avoid_zones: string[];
  emergency: Record<string, string>;
};

function SafetyPage() {
  const fn = useServerFn(safetyBrief);
  const [city, setCity] = useState("Chennai");
  const [profile, setProfile] = useState("solo traveler");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("current_city")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data?.current_city) setCity(data.current_city);
    })();
  }, []);

  async function run() {
    if (!city) return toast.error("Enter a city");
    setLoading(true);
    try {
      setBrief(await fn({ data: { city, profile } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const verdictColor =
    brief?.verdict === "safe"
      ? "text-emerald-400"
      : brief?.verdict === "caution"
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <AppShell title="Safety">
      <TravelBackground variant="subtle" />
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Safety brief</h2>
              <p className="text-xs text-muted-foreground">
                Real risks, safe zones, emergency numbers.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <div className="flex flex-wrap gap-1.5">
              {["solo traveler", "solo female", "family", "couple", "LGBTQ+"].map((p) => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  className={`rounded-full px-3 py-1 text-xs ${profile === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={run} disabled={loading} className="mt-4 w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assessing…
              </>
            ) : (
              "Get safety brief"
            )}
          </Button>
        </div>

        {brief && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Overall
                </div>
                <div className={`mt-1 text-3xl font-bold ${verdictColor}`}>
                  {brief.overall_score}
                </div>
                <div className={`text-[10px] uppercase tracking-wider ${verdictColor}`}>
                  {brief.verdict}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <Sun className="mx-auto h-4 w-4 text-amber-400" />
                <div className="mt-1 text-2xl font-bold">{brief.day_score}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Day
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <Moon className="mx-auto h-4 w-4 text-secondary" />
                <div className="mt-1 text-2xl font-bold">{brief.night_score}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Night
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
              <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
                <AlertTriangle className="h-3 w-3" /> Top risks
              </div>
              <ul className="space-y-1 text-sm">
                {brief.top_risks.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Check className="h-3 w-3" /> Do
                </div>
                <ul className="space-y-1 text-sm">
                  {brief.do.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
                  <X className="h-3 w-3" /> Don't
                </div>
                <ul className="space-y-1 text-sm">
                  {brief.dont.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Safer zones
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {brief.safe_zones.map((z) => (
                    <span key={z} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs">
                      {z}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
                  Avoid after dark
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {brief.avoid_zones.map((z) => (
                    <span key={z} className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs">
                      {z}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Phone className="h-3 w-3" /> Emergency
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {Object.entries(brief.emergency).map(([k, v]) => (
                  <a
                    key={k}
                    href={`tel:${v}`}
                    className="rounded-xl border border-border bg-muted/40 p-3 text-center hover:border-primary"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {k.replace(/_/g, " ")}
                    </div>
                    <div className="text-lg font-bold text-primary">{v}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
