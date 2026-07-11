import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/score")({
  component: ScorePage,
});

const WEIGHTS = { match: 0.32, crowd: 0.18, budget: 0.18, distance: 0.16, weather: 0.16 } as const;

function ScorePage() {
  const [s, setS] = useState({ match: 92, crowd: 70, budget: 85, distance: 80, weather: 90 });
  const overall = useMemo(
    () =>
      Math.round(
        Object.entries(s).reduce((acc, [k, v]) => acc + v * WEIGHTS[k as keyof typeof WEIGHTS], 0),
      ),
    [s],
  );

  return (
    <AppShell title="Discovery Score">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">How PRISM ranks every recommendation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Five sub-scores, fixed weights, one Discovery Score. Try the sliders.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-primary bg-card p-6 text-center shadow-[var(--shadow-glow)]">
          <div className="text-6xl font-bold text-primary">{overall}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            Overall Discovery Score
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" />{" "}
            {overall > 85 ? "PRISM-strong match" : overall > 70 ? "Solid pick" : "Worth a look"}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {(Object.keys(s) as Array<keyof typeof s>).map((k) => (
            <div key={k} className="space-y-1.5">
              <Label className="flex items-center justify-between text-sm capitalize">
                <span>
                  {k}{" "}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    weight {Math.round(WEIGHTS[k] * 100)}%
                  </span>
                </span>
                <span className="font-mono text-primary">{s[k]}</span>
              </Label>
              <Slider
                value={[s[k]]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setS({ ...s, [k]: v[0] })}
              />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-border p-5 text-xs text-muted-foreground">
          <strong className="text-foreground">Formula:</strong> overall = 0.32·match + 0.18·crowd +
          0.18·budget + 0.16·distance + 0.16·weather. Tuned for the Indian travel context — match
          matters most, weather and distance even out the rest.
        </div>
      </div>
    </AppShell>
  );
}
