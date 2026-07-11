import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Compass,
  MapPinned,
  Heart,
  ArrowRight,
  Zap,
  CloudRain,
  Users,
  Brain,
  Route as RouteIcon,
  MessageSquare,
  BarChart3,
  Layers,
} from "lucide-react";
import { TravelBackground } from "@/components/travel-background";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRISM — What should you do next?" },
      {
        name: "description",
        content:
          "PRISM (Personalized Recommendation & Intelligent Smart Model) — like a prism revealing hidden experiences. AI travel discovery for India.",
      },
      {
        property: "og:title",
        content: "PRISM — Personalized Recommendation & Intelligent Smart Model",
      },
      {
        property: "og:description",
        content:
          "Refracts your context — location, time, budget, mood, weather — into your next best move.",
      },
    ],
  }),
  component: Index,
});

const MODULES = [
  {
    icon: Brain,
    name: "Smart Traveler Profile",
    body: "K-Means clustering + embeddings turn your taste into a vector.",
  },
  {
    icon: MapPinned,
    name: "Hidden Gems Engine",
    body: "Interest match + rating − popularity. Local secrets, not tourist traps.",
  },
  {
    icon: Layers,
    name: "AI Travel Feed",
    body: "Instagram × Google Maps × Netflix recs. Swipe your next move.",
  },
  {
    icon: Sparkles,
    name: "Smart Itinerary",
    body: "Tell PRISM your time + budget. Get a costed hour-by-hour plan.",
  },
  {
    icon: BarChart3,
    name: "Crowd Prediction",
    body: "Random Forest / XGBoost on time, weather, weekends, events.",
  },
  {
    icon: CloudRain,
    name: "Weather Intelligence",
    body: "Rain detected → swaps beach for cafe automatically.",
  },
  {
    icon: RouteIcon,
    name: "Smart Route Optimization",
    body: "Shortest route, least traffic, lowest cost — all three at once.",
  },
  {
    icon: MessageSquare,
    name: "Travel Chat Assistant",
    body: '"I\'m bored." → "Hidden cafe 300m away. Want directions?"',
  },
  {
    icon: Users,
    name: "Similar Traveler Matching",
    body: "User embeddings find travelers with your exact taste.",
  },
  {
    icon: Heart,
    name: "Travel Memory System",
    body: "Learns from what you saved, skipped, visited. Gets sharper daily.",
  },
];

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth callback — Supabase processes the hash fragment and sets the session.
    // We listen for the session to be set and redirect to /app.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        window.history.replaceState({}, "", "/app");
        navigate({ to: "/app", replace: true });
      }
    });

    // Also check if a session already exists (e.g. from a prior OAuth callback processed
    // by the Supabase client on this page).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.history.replaceState({}, "", "/app");
        navigate({ to: "/app", replace: true });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TravelBackground />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-prism)" }}
          >
            <Layers className="h-4 w-4" />
          </span>
          <span className="tracking-[0.2em]">PRISM</span>
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/modules" className="hover:text-foreground">
            Modules
          </Link>
          <Link to="/features" className="hover:text-foreground">
            Features
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
        </nav>
        <Link to="/auth">
          <Button variant="outline" className="text-sm">
            Sign in
          </Button>
        </Link>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> Personalized · Recommendation ·
            Intelligent · Smart · Model
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-prism)" }}
            >
              PRISM
            </span>
            <br />
            <span className="text-3xl font-medium text-muted-foreground md:text-4xl">
              refracts your context into your next move.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Like a prism revealing hidden experiences — PRISM splits your location, time, budget,
            mood, and the weather into a ranked answer: <em>what should you do next?</em>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full px-6">
                Start exploring <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/modules">
              <Button size="lg" variant="outline" className="rounded-full px-6">
                See the 13 modules
              </Button>
            </Link>
          </div>

          <div className="mx-auto mt-12 grid max-w-md grid-cols-2 gap-3 text-left text-sm">
            <div className="rounded-xl border border-border bg-card/40 p-3 backdrop-blur">
              <p className="text-xs text-muted-foreground">Google Maps</p>
              <p className="font-medium">"Where can I go?"</p>
            </div>
            <div className="rounded-xl border border-primary bg-primary/10 p-3 shadow-[var(--shadow-glow)] backdrop-blur">
              <p className="text-xs text-primary">PRISM</p>
              <p className="font-medium">"What should I do next?"</p>
            </div>
          </div>
        </div>

        <div id="features" className="mt-24">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            The seven colors of PRISM
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Each module is a wavelength of context, refracted into one ranked recommendation.
          </p>
          <div className="mt-10 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {MODULES.map((f) => (
              <div
                key={f.name}
                className="group rounded-2xl border border-border bg-card/60 p-5 backdrop-blur transition hover:border-primary hover:shadow-[var(--shadow-glow)]"
              >
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
                  style={{ background: "var(--gradient-warm)" }}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{f.name}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 rounded-3xl border border-border bg-card/50 p-8 text-center backdrop-blur md:p-12">
          <Zap className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">
            One tap. One answer. One next move.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            PRISM reads your moment and tells you the single best thing to do right now — with a
            Discovery Score combining Match, Crowd, Budget, Distance, and Weather.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mt-6 rounded-full px-8">
              Open PRISM <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        PRISM — Personalized Recommendation & Intelligent Smart Model · Built for India
      </footer>
    </div>
  );
}
