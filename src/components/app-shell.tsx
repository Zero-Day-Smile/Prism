import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Zap,
  Sparkles,
  Compass,
  MapPinned,
  Heart,
  LayoutGrid,
  X,
  Home,
  MessageSquare,
  CloudRain,
  BarChart3,
  Route as RouteIcon,
  Users,
  Brain,
  Gauge,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  BookOpen,
  Wallet,
  Shield,
  Navigation,
  TrendingUp,
  LifeBuoy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { TravelBackground } from "@/components/travel-background";
import type { ReactNode } from "react";

const tabs = [
  { to: "/app/now", label: "Now", icon: Zap },
  { to: "/app/discover", label: "Discover", icon: Compass },
  { to: "/app/chat", label: "Chat", icon: MessageSquare },
  { to: "/app/trips", label: "Trips", icon: Heart },
] as const;

const drawerSections = [
  {
    title: "Plan",
    items: [
      {
        to: "/app/plan",
        label: "Micro-Trip",
        icon: Sparkles,
        tint: "from-fuchsia-500 to-violet-600",
      },
      {
        to: "/app/gems",
        label: "Hidden Gems",
        icon: MapPinned,
        tint: "from-amber-400 to-orange-600",
      },
      {
        to: "/app/routes",
        label: "Smart Route",
        icon: RouteIcon,
        tint: "from-emerald-400 to-teal-600",
      },
      {
        to: "/app/story",
        label: "Story Mode",
        icon: BookOpen,
        tint: "from-violet-500 to-purple-700",
      },
      { to: "/app/budget", label: "Budget", icon: Wallet, tint: "from-green-400 to-emerald-600" },
      { to: "/app/nearby", label: "Nearby", icon: Navigation, tint: "from-teal-400 to-cyan-600" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/app/crowd", label: "Crowd", icon: BarChart3, tint: "from-rose-400 to-red-600" },
      { to: "/app/weather", label: "Weather", icon: CloudRain, tint: "from-sky-400 to-blue-600" },
      { to: "/app/score", label: "Score", icon: Gauge, tint: "from-lime-400 to-green-600" },
      { to: "/app/safety", label: "Safety", icon: Shield, tint: "from-red-400 to-rose-600" },
      {
        to: "/app/insights",
        label: "Insights",
        icon: TrendingUp,
        tint: "from-orange-400 to-amber-600",
      },
      {
        to: "/app/survival",
        label: "Survival",
        icon: LifeBuoy,
        tint: "from-red-500 to-orange-700",
      },
    ],
  },
  {
    title: "You",
    items: [
      { to: "/app/profile", label: "Profile", icon: Brain, tint: "from-indigo-400 to-purple-600" },
      { to: "/app/memory", label: "Memory", icon: Heart, tint: "from-pink-400 to-fuchsia-600" },
      { to: "/app/similar", label: "Twins", icon: Users, tint: "from-cyan-400 to-sky-600" },
      {
        to: "/app/settings",
        label: "Settings",
        icon: SettingsIcon,
        tint: "from-slate-400 to-slate-600",
      },
    ],
  },
] as const;

export function AppShell({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <TravelBackground variant="subtle" />
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              PRISM
            </div>
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {action}
            <Link
              to="/"
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Home"
              title="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="text-muted-foreground"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Link
              to="/app/settings"
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      {/* App-drawer overlay (slide up like a mobile app launcher) */}
      {drawer && (
        <div
          className="fixed inset-0 z-40 animate-in fade-in bg-background/70 backdrop-blur-md"
          onClick={() => setDrawer(false)}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl transform rounded-t-3xl border-t border-border bg-card/95 shadow-2xl backdrop-blur transition-transform duration-300 ease-out ${drawer ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"}`}
        style={{ maxHeight: "80vh" }}
        aria-hidden={!drawer}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-sm font-semibold">All modules</h2>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => setDrawer(false)}
            className="rounded-full border border-border bg-background/60 p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-5 pb-24 pt-2">
          {drawerSections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.title}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {section.items.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setDrawer(false)}
                    className="group flex flex-col items-center gap-1.5 text-center"
                  >
                    <div
                      className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${it.tint} text-white shadow-md transition-transform group-active:scale-95 group-hover:scale-105`}
                    >
                      <it.icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-foreground">
                      {it.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 items-end">
          {tabs.slice(0, 2).map((t) => {
            const active = location.pathname === t.to || location.pathname.startsWith(t.to + "/");
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <t.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                {t.label}
              </Link>
            );
          })}
          {/* Center FAB — App drawer */}
          <button
            onClick={() => setDrawer((d) => !d)}
            className="relative -mt-6 mx-auto flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-[0_10px_30px_-8px_rgba(180,80,255,0.55)] transition-transform active:scale-95"
            style={{
              background: "var(--gradient-prism, linear-gradient(135deg,#a855f7,#06b6d4,#f59e0b))",
            }}
            aria-label="Open app drawer"
          >
            <LayoutGrid className="h-6 w-6" />
          </button>
          {tabs.slice(2).map((t) => {
            const active = location.pathname === t.to || location.pathname.startsWith(t.to + "/");
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <t.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
