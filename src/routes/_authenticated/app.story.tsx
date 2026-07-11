import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen, Sparkles, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { generateStory } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { TravelBackground } from "@/components/travel-background";

export const Route = createFileRoute("/_authenticated/app/story")({ component: StoryPage });

type Story = {
  title: string;
  chapters: Array<{
    time: string;
    heading: string;
    place: string;
    body: string;
    cost?: number;
    tip?: string;
  }>;
  closing: string;
};

function StoryPage() {
  const fn = useServerFn(generateStory);
  const [city, setCity] = useState("Chennai");
  const [hours, setHours] = useState(6);
  const [vibe, setVibe] = useState("wander");
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<Story | null>(null);

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
      const { data: u } = await supabase.auth.getUser();
      const { data: p } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", u.user!.id)
        .maybeSingle();
      const res = await fn({ data: { city, hours, vibe, interests: p?.interests ?? [] } });
      setStory(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Story Mode">
      <TravelBackground variant="subtle" />
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-warm)" }}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Turn a day into a story</h2>
              <p className="text-xs text-muted-foreground">
                Not a list. A cinematic narrative you can save & share.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input
                type="number"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vibe</Label>
              <Input
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="wander, foodie, romantic…"
              />
            </div>
          </div>
          <Button onClick={run} disabled={loading} className="mt-4 w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing your story…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Write my day
              </>
            )}
          </Button>
        </div>

        {story && (
          <article className="space-y-5 rounded-3xl border border-border bg-card/70 p-6 backdrop-blur">
            <h1
              className="bg-clip-text text-transparent text-3xl font-bold leading-tight"
              style={{ backgroundImage: "var(--gradient-prism)" }}
            >
              {story.title}
            </h1>
            <ol className="space-y-5 border-l-2 border-primary/40 pl-5">
              {story.chapters.map((c, i) => (
                <li
                  key={i}
                  className="relative animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span
                    className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-primary-foreground"
                    style={{ background: "var(--gradient-prism)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {c.time} · {c.place}
                  </div>
                  <h3 className="mt-0.5 text-lg font-semibold">{c.heading}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">{c.body}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {typeof c.cost === "number" && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {c.cost}
                      </span>
                    )}
                    {c.tip && <span className="italic">💡 {c.tip}</span>}
                  </div>
                </li>
              ))}
            </ol>
            <p className="border-t border-border pt-4 text-sm italic text-muted-foreground">
              {story.closing}
            </p>
          </article>
        )}
      </div>
    </AppShell>
  );
}
