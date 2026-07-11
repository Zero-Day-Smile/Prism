import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — PRISM" },
      {
        name: "description",
        content:
          "PRISM stands for Personalized Recommendation & Intelligent Smart Model. The story behind the name.",
      },
      { property: "og:title", content: "About — PRISM" },
      {
        property: "og:description",
        content:
          "Like a prism revealing hidden experiences — refracting your context into your next move.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <Link to="/auth">
          <Button size="sm">Try PRISM</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        <div className="text-center">
          <span
            className="grid h-12 w-12 mx-auto place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-prism)" }}
          >
            <Layers className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
            About{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-prism)" }}
            >
              PRISM
            </span>
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Personalized · Recommendation · Intelligent · Smart · Model
          </p>
        </div>

        <div className="prose prose-invert mt-12 space-y-6 text-sm text-muted-foreground">
          <p className="text-base">
            <strong className="text-foreground">Like a prism revealing hidden experiences</strong> —
            our app refracts the white light of your context (location, time, budget, mood, weather,
            history) into a full spectrum of possibilities, then focuses them back into one ranked
            answer.
          </p>

          <Block title="The insight">
            <p>
              Google Maps answers <em>"Where can I go?"</em>. PRISM answers{" "}
              <em>"What should I do next?"</em> — a much more interesting AI/ML problem.
            </p>
          </Block>

          <Block title="The bet">
            <p>
              Most travel apps optimize for <em>getting somewhere</em>. PRISM optimizes for{" "}
              <em>knowing what's worth doing right now</em>. That's a clearer problem statement and
              a stronger AI story.
            </p>
          </Block>

          <Block title="Built for India">
            <p>
              Specific. Local. ₹-aware. PRISM defaults to street food over fine dining when your
              budget says so, suggests autos over cabs when the route makes sense, and surfaces the
              cafés and viewpoints Indians actually share with their friends.
            </p>
          </Block>

          <Block title="The stack">
            <p>
              React · Tailwind · TanStack · Custom AI Routing (Gemini, OpenAI, Groq). ML modules use
              K-Means clustering, collaborative filtering, and Random Forest crowd prediction with
              an XGBoost upgrade path.
            </p>
          </Block>
        </div>

        <div className="mt-12 text-center">
          <Link to="/auth">
            <Button size="lg" className="rounded-full px-8">
              Open PRISM
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
