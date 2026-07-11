import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Mic, Sparkles, ScanEye } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features & Roadmap — PRISM" },
      {
        name: "description",
        content:
          "What PRISM ships today and what's on the roadmap — computer vision, voice, AR, AI companion.",
      },
      { property: "og:title", content: "Features & Roadmap — PRISM" },
      {
        property: "og:description",
        content: "Phase 1, Phase 2, Phase 3 — and the long-term vision for PRISM.",
      },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
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

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <h1 className="text-center text-4xl font-bold tracking-tight md:text-5xl">
          The PRISM roadmap
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          From MVP to AI companion — phase by phase.
        </p>

        <Phase tag="Phase 1 — Shipping" title="The MVP that proves the loop">
          <li>Smart Traveler Profile</li>
          <li>Hidden Gems Engine</li>
          <li>AI Travel Feed</li>
          <li>Dynamic Itinerary Generator</li>
          <li>Basic Crowd Prediction</li>
        </Phase>

        <Phase tag="Phase 2 — Next" title="Sharper context, deeper memory">
          <li>Activity Prediction (collaborative filtering)</li>
          <li>Weather Intelligence (live API)</li>
          <li>Travel Chat Assistant</li>
        </Phase>

        <Phase tag="Phase 3 — Long term" title="PRISM as the discovery engine">
          <li>Computer Vision: upload a photo, PRISM learns your eye.</li>
          <li>Voice AI: "I have 3 hours and ₹500." → instant trip.</li>
          <li>AR Exploration: point camera, see live recommendations.</li>
          <li>AI Travel Companion: PRISM remembers you, surprises you.</li>
        </Phase>

        <div className="mt-12 grid gap-3 md:grid-cols-4">
          {[
            { i: Camera, t: "Computer Vision" },
            { i: Mic, t: "Voice AI" },
            { i: ScanEye, t: "AR Exploration" },
            { i: Sparkles, t: "AI Companion" },
          ].map((x) => (
            <div
              key={x.t}
              className="rounded-2xl border border-border bg-card/60 p-5 text-center backdrop-blur"
            >
              <x.i className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-3 text-sm font-medium">{x.t}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Phase({
  tag,
  title,
  children,
}: {
  tag: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wider text-primary">{tag}</p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-muted-foreground">
        {children}
      </ul>
    </section>
  );
}
