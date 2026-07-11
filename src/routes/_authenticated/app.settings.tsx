import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bell,
  Moon,
  Shield,
  LogOut,
  User,
  Sparkles,
  Trash2,
  MapPin,
  Palette,
  Globe,
  Languages,
  Wifi,
  IndianRupee,
  Home,
  HelpCircle,
  Info,
  Users,
  Compass,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [companions, setCompanions] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<string>("balanced");
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    notifs: true,
    crowdAlerts: true,
    weatherSwaps: true,
    gemPings: true,
    offline: false,
    dataSaver: false,
    voiceMode: true,
    learning: true,
  });
  const [theme, setTheme] = useState<"prism" | "dark" | "light">(() => {
    if (typeof window === "undefined") return "prism";
    return (localStorage.getItem("prism-theme") as "prism" | "dark" | "light") ?? "prism";
  });
  const [lang, setLang] = useState("en");
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      if (u.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("current_city, interests, travel_style")
          .eq("id", u.user.id)
          .maybeSingle();
        if (p?.current_city) setCity(p.current_city);
        const ints = (p?.interests ?? []) as string[];
        setInterests(ints.filter((t) => !t.startsWith("with:")));
        setCompanions(ints.filter((t) => t.startsWith("with:")).map((t) => t.slice(5)));
        if (p?.travel_style) setTravelStyle(p.travel_style);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (theme === "dark") root.classList.add("dark");
    if (theme === "light") root.classList.add("light");
    localStorage.setItem("prism-theme", theme);
  }, [theme]);

  function setPref(k: string, v: boolean) {
    setPrefs((p) => ({ ...p, [k]: v }));
  }

  async function saveCity() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, current_city: city });
    if (error) toast.error(error.message);
    else toast.success(`Home city set to ${city}`);
  }

  async function savePersona(next?: {
    interests?: string[];
    companions?: string[];
    travelStyle?: string;
  }) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const ints = next?.interests ?? interests;
    const comps = next?.companions ?? companions;
    const style = next?.travelStyle ?? travelStyle;
    const merged = [...ints, ...comps.map((c) => `with:${c}`)];
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: u.user.id, interests: merged, travel_style: style });
    if (error) toast.error(error.message);
    else toast.success("Travel persona updated");
  }

  function toggleInterest(t: string) {
    const next = interests.includes(t) ? interests.filter((i) => i !== t) : [...interests, t];
    setInterests(next);
    savePersona({ interests: next });
  }
  function toggleCompanion(t: string) {
    const next = companions.includes(t) ? companions.filter((i) => i !== t) : [...companions, t];
    setCompanions(next);
    savePersona({ companions: next });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Settings">
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-full text-primary-foreground"
              style={{
                background: "var(--gradient-prism, linear-gradient(135deg,#a855f7,#06b6d4))",
              }}
            >
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{email || "Signed in"}</p>
              <p className="text-xs text-muted-foreground">Manage your PRISM account</p>
            </div>
            <Link
              to="/"
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Home className="h-3 w-3" /> Home
            </Link>
          </div>
        </section>

        <Group title="Appearance">
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4 text-primary" /> Theme
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["prism", "dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    toast.success(`Theme: ${t}`);
                  }}
                  className={`rounded-xl border p-3 text-xs capitalize transition-all ${theme === t ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"}`}
                >
                  <div
                    className="mb-2 h-10 rounded-lg"
                    style={{
                      background:
                        t === "prism"
                          ? "var(--gradient-prism)"
                          : t === "dark"
                            ? "linear-gradient(135deg,#0f0f1a,#1a1a2e)"
                            : "linear-gradient(135deg,#f5f5f7,#e5e7eb)",
                    }}
                  />
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Dark mode applies system-wide instantly.
            </p>
          </div>
        </Group>

        <Group title="Travel persona">
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Compass className="h-4 w-4 text-primary" /> Interests{" "}
              <span className="text-[10px] text-muted-foreground">(pick as many as you like)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "food",
                "street food",
                "nature",
                "culture",
                "history",
                "cafes",
                "nightlife",
                "adventure",
                "photography",
                "art",
                "spiritual",
                "beaches",
                "mountains",
                "shopping",
                "offbeat",
                "festivals",
              ].map((t) => {
                const on = interests.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleInterest(t)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition active:scale-95 ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {on && <Check className="h-3 w-3" />} {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary" /> Travelling with
            </div>
            <div className="flex flex-wrap gap-2">
              {["solo", "partner", "family", "kids", "friends", "team", "pet"].map((c) => {
                const on = companions.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCompanion(c)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs capitalize transition active:scale-95 ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {on && <Check className="h-3 w-3" />} {c}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              PRISM adapts crowd, safety and budget suggestions to your group.
            </p>
          </div>
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" /> Travel style
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["budget", "balanced", "comfort", "luxury"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setTravelStyle(s);
                    savePersona({ travelStyle: s });
                  }}
                  className={`rounded-xl border px-2 py-2 text-xs capitalize transition ${travelStyle === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Group>

        <Group title="Location">
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" /> Home city
            </div>
            <div className="flex gap-2">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
              <Button size="sm" onClick={saveCity}>
                Save
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              PRISM uses this as the default across Discover, Now, and Plan.
            </p>
          </div>
          <Row
            icon={<Globe className="h-4 w-4" />}
            label="Currency"
            desc="Shown across budgets & itineraries"
          >
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </Row>
          <Row
            icon={<Languages className="h-4 w-4" />}
            label="Language"
            desc="Assistant reply language"
          >
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ta">தமிழ்</option>
            </select>
          </Row>
        </Group>

        <Group title="Preferences">
          <Row
            icon={<Bell className="h-4 w-4" />}
            label="Push notifications"
            desc="Master toggle for all alerts"
          >
            <Toggle on={prefs.notifs} onChange={(v) => setPref("notifs", v)} />
          </Row>
          <Row icon={<BellDot />} label="Crowd alerts" desc="Ping when a spot is unusually empty">
            <Toggle on={prefs.crowdAlerts} onChange={(v) => setPref("crowdAlerts", v)} />
          </Row>
          <Row
            icon={<Moon className="h-4 w-4" />}
            label="Weather swaps"
            desc="Suggest alternatives when weather turns"
          >
            <Toggle on={prefs.weatherSwaps} onChange={(v) => setPref("weatherSwaps", v)} />
          </Row>
          <Row
            icon={<Sparkles className="h-4 w-4" />}
            label="Hidden gem pings"
            desc="Alert me when I'm 500m from a gem"
          >
            <Toggle on={prefs.gemPings} onChange={(v) => setPref("gemPings", v)} />
          </Row>
          <Row
            icon={<Sparkles className="h-4 w-4" />}
            label="PRISM learning"
            desc="Learn from every swipe, save, and skip"
          >
            <Toggle on={prefs.learning} onChange={(v) => setPref("learning", v)} />
          </Row>
          <Row
            icon={<Wifi className="h-4 w-4" />}
            label="Offline maps"
            desc="Cache city tiles for airplane / no-signal mode"
          >
            <Toggle on={prefs.offline} onChange={(v) => setPref("offline", v)} />
          </Row>
          <Row
            icon={<IndianRupee className="h-4 w-4" />}
            label="Data saver"
            desc="Fewer images, shorter AI responses"
          >
            <Toggle on={prefs.dataSaver} onChange={(v) => setPref("dataSaver", v)} />
          </Row>
        </Group>

        <Group title="Privacy & data">
          <Row
            icon={<Shield className="h-4 w-4" />}
            label="Export my data"
            desc="Download trips, profile & memory (JSON)"
          >
            <Button variant="outline" size="sm" onClick={() => toast.success("Export queued")}>
              Export
            </Button>
          </Row>
          <Row
            icon={<Trash2 className="h-4 w-4" />}
            label="Clear travel memory"
            desc="Reset what PRISM has learned"
            danger
          >
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { data: u } = await supabase.auth.getUser();
                if (!u.user) return;
                await supabase.from("preference_signals").delete().eq("user_id", u.user.id);
                toast.success("PRISM memory reset");
              }}
            >
              Clear
            </Button>
          </Row>
        </Group>

        <Group title="About">
          <Row
            icon={<Info className="h-4 w-4" />}
            label="About PRISM"
            desc="Personalized Recommendation & Intelligent Smart Model"
          >
            <Link to="/" className="text-xs text-primary hover:underline">
              Open →
            </Link>
          </Row>
          <Row
            icon={<HelpCircle className="h-4 w-4" />}
            label="Help & feedback"
            desc="Report an issue or share an idea"
          >
            <Button variant="outline" size="sm" onClick={() => toast.info("Coming soon")}>
              Contact
            </Button>
          </Row>
        </Group>

        <Button onClick={signOut} variant="outline" className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>

        <p className="pb-6 text-center text-[11px] text-muted-foreground">
          PRISM · v0.1 · Made for Indian travelers
        </p>
      </div>
    </AppShell>
  );
}

function BellDot() {
  return (
    <span className="relative inline-flex">
      <Bell className="h-4 w-4" />
      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
    </span>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  desc,
  children,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl ${danger ? "bg-destructive/15 text-destructive" : "bg-muted text-primary"}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {desc && <p className="truncate text-xs text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}
