import { Plane, MapPin, Compass, Mountain, Palmtree, Sun } from "lucide-react";

/**
 * Ambient animated travel background:
 *  - aurora prism gradient wash
 *  - dashed flight paths tracing across the screen
 *  - drifting plane
 *  - floating destination pins
 *  - slow-spinning compass
 *  - pulsing "you are here" ring
 *
 * Purely decorative, pointer-events: none, sits at -z-10.
 */
export function TravelBackground({ variant = "full" }: { variant?: "full" | "subtle" }) {
  const opacity = variant === "subtle" ? "opacity-40" : "opacity-70";
  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${opacity}`}>
      {/* Aurora wash */}
      <div
        className="absolute inset-0 animate-prism-shimmer"
        style={{ background: "var(--gradient-aurora)" }}
      />

      {/* Dashed flight paths */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="prism-path-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.22 310)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 90)" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="prism-path-b" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.7 0.22 220)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.72 0.22 310)" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M -20 620 Q 300 300 620 480 T 1240 220"
          fill="none"
          stroke="url(#prism-path-a)"
          strokeWidth="2"
          className="animate-prism-dash"
        />
        <path
          d="M -20 160 Q 400 500 780 260 T 1240 620"
          fill="none"
          stroke="url(#prism-path-b)"
          strokeWidth="2"
          className="animate-prism-dash"
          style={{ animationDuration: "18s" }}
        />
      </svg>

      {/* Floating pins & icons */}
      <div className="absolute left-[8%] top-[18%] animate-prism-float text-primary/60">
        <MapPin className="h-6 w-6" />
      </div>
      <div
        className="absolute right-[12%] top-[26%] animate-prism-float text-secondary/70"
        style={{ animationDelay: "1.2s" }}
      >
        <Mountain className="h-8 w-8" />
      </div>
      <div
        className="absolute left-[22%] bottom-[22%] animate-prism-float text-accent/70"
        style={{ animationDelay: "2.4s" }}
      >
        <Palmtree className="h-7 w-7" />
      </div>
      <div
        className="absolute right-[18%] bottom-[16%] animate-prism-float text-primary/60"
        style={{ animationDelay: "0.6s" }}
      >
        <Sun className="h-6 w-6" />
      </div>

      {/* Drifting plane */}
      <div className="absolute top-[38%] animate-prism-drift text-foreground/50">
        <Plane className="h-6 w-6 -rotate-12" />
      </div>
      <div
        className="absolute top-[70%] animate-prism-drift text-foreground/40"
        style={{ animationDelay: "8s", animationDuration: "28s" }}
      >
        <Plane className="h-5 w-5 -rotate-12" />
      </div>

      {/* Slow compass */}
      <div className="absolute -right-16 -top-16 h-64 w-64 animate-prism-spin-slow text-primary/15">
        <Compass className="h-full w-full" />
      </div>

      {/* Pulsing "you are here" */}
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40" />
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary animate-prism-ring" />
      <div
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-secondary animate-prism-ring"
        style={{ animationDelay: "1.5s" }}
      />
    </div>
  );
}
