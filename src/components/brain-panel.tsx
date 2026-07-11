import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Brain, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Signal = { tag: string; signal: number };
type Learned = { tag: string; score: number; count: number };

/**
 * Shows what the PRISM Brain has learned about the user from likes/skips.
 * Aggregates preference_signals on the client (small volume; RLS-scoped).
 */
export function BrainPanel() {
  const [top, setTop] = useState<Learned[]>([]);
  const [avoid, setAvoid] = useState<Learned[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("preference_signals")
        .select("tag, signal")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (data ?? []) as Signal[];
      const map = new Map<string, { score: number; count: number }>();
      for (const r of rows) {
        const cur = map.get(r.tag) ?? { score: 0, count: 0 };
        cur.score += r.signal;
        cur.count += 1;
        map.set(r.tag, cur);
      }
      const list: Learned[] = [...map.entries()].map(([tag, v]) => ({
        tag,
        score: v.score,
        count: v.count,
      }));
      setTop(
        list
          .filter((l) => l.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6),
      );
      setAvoid(
        list
          .filter((l) => l.score < 0)
          .sort((a, b) => a.score - b.score)
          .slice(0, 4),
      );
      setTotal(rows.length);
    })();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-40"
        style={{ background: "var(--gradient-prism)" }}
      />
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground animate-prism-shimmer"
          style={{ background: "var(--gradient-prism)" }}
        >
          <Brain className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">PRISM Brain</h2>
          <p className="text-xs text-muted-foreground">
            Learning from every tap. {total} signals recorded.
          </p>
        </div>
        <Link to="/app/memory" className="text-xs text-primary hover:underline">
          Memory →
        </Link>
      </div>

      {total === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-4 w-4 text-primary" />
          Swipe on the Discover feed — the Brain gets sharper with every like or skip.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {top.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <TrendingUp className="h-3 w-3" /> You love
              </div>
              <div className="flex flex-wrap gap-1.5">
                {top.map((l) => (
                  <span
                    key={l.tag}
                    className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px]"
                  >
                    {l.tag} <span className="opacity-60">+{l.score}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {avoid.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                <TrendingDown className="h-3 w-3" /> You skip
              </div>
              <div className="flex flex-wrap gap-1.5">
                {avoid.map((l) => (
                  <span
                    key={l.tag}
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px]"
                  >
                    {l.tag} <span className="opacity-60">{l.score}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
