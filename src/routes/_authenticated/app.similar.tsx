import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/similar")({
  component: SimilarPage,
});

// Synthetic traveler embeddings to demo collaborative filtering UI.
const PEOPLE = [
  {
    name: "Aarav",
    city: "Pondicherry",
    interests: ["Cafes", "Photography", "Beaches", "Quiet Places"],
  },
  { name: "Diya", city: "Bangalore", interests: ["Street Food", "Nightlife", "Markets", "Art"] },
  {
    name: "Karthik",
    city: "Chennai",
    interests: ["Temples", "Culture", "Photography", "Viewpoints"],
  },
  { name: "Meher", city: "Goa", interests: ["Beaches", "Nightlife", "Cafes", "Adventure"] },
  { name: "Sana", city: "Jaipur", interests: ["Culture", "Photography", "Markets", "Shopping"] },
  { name: "Ishaan", city: "Manali", interests: ["Hiking", "Adventure", "Nature", "Viewpoints"] },
  { name: "Tara", city: "Mumbai", interests: ["Cafes", "Art", "Nightlife", "Street Food"] },
  { name: "Rohan", city: "Hampi", interests: ["Hiking", "Photography", "Culture", "Quiet Places"] },
];

function jaccard(a: string[], b: string[]) {
  const A = new Set(a),
    B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

function SimilarPage() {
  const [mine, setMine] = useState<string[]>([]);
  const [city, setCity] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("interests, current_city")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setMine(data.interests ?? []);
        setCity(data.current_city ?? "");
      }
    })();
  }, []);

  const ranked = useMemo(
    () =>
      PEOPLE.map((p) => ({ ...p, sim: jaccard(mine, p.interests) })).sort((a, b) => b.sim - a.sim),
    [mine],
  );

  return (
    <AppShell title="Similar Travelers">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Your taste twins</h2>
              <p className="text-xs text-muted-foreground">
                User embeddings via cosine/Jaccard similarity on your interest vector.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">You:</span>
            {mine.length === 0 ? (
              <span className="text-xs">Add interests in your profile.</span>
            ) : (
              mine.map((i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {i}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {ranked.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border bg-card p-4 ${p.sim > 0.4 ? "border-primary shadow-[var(--shadow-glow)]" : "border-border"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {p.city}
                    {city && p.city === city ? " · same city" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">{Math.round(p.sim * 100)}%</div>
                  <div className="text-[10px] uppercase text-muted-foreground">match</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.interests.map((i) => (
                  <Badge
                    key={i}
                    variant={mine.includes(i) ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {i}
                  </Badge>
                ))}
              </div>
              {p.sim > 0.4 && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-primary">
                  <Sparkles className="h-3 w-3" /> PRISM thinks you'd both love the same places.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
