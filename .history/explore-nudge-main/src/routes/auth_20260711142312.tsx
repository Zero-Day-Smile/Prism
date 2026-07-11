import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { prismOAuth } from "@/integrations/prism-oauth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PRISM" },
      {
        name: "description",
        content: "Sign in to PRISM and let your context refract into your next move.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);

  const loading = googleLoading || appleLoading || emailLoading;

  useEffect(() => {
    const init = async () => {
      // Handle OAuth callback state and clear OAuth URL params/hash after session is set.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        window.history.replaceState({}, "", "/app");
        navigate({ to: "/app", replace: true });
      }

      const url = new URL(window.location.href);
      const err = url.searchParams.get("error");
      const errDesc = url.searchParams.get("error_description");
      const errCode = url.searchParams.get("error_code");

      if (err) {
        toast.error(`${err}${errCode ? ` (${errCode})` : ""}${errDesc ? `: ${errDesc}` : ""}`);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        window.history.replaceState({}, "", "/app");
        navigate({ to: "/app", replace: true });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSignInEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setEmailLoading(false);
    if (error) toast.error(error.message);
  }

  async function handleSignUpEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: signUpName },
      },
    });
    setEmailLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm your account.");
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const result = await prismOAuth.auth.signInWithGoogle();
    setGoogleLoading(false);

    if ("error" in result) {
      toast.error(result.error.message ?? "Google sign-in failed");
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) toast.error(error.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apple sign-in failed");
    } finally {
      setAppleLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) return;

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset link sent. Check your email.");
        setShowResetForm(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Password reset failed");
    } finally {
      setEmailLoading(false);
    }
  }

  if (showResetForm) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{ background: "var(--gradient-sunset)", filter: "blur(80px)" }}
        />
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
          <Link to="/" className="mb-8 flex items-center gap-2 self-center font-semibold">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-prism)" }}
            >
              <Layers className="h-4 w-4" />
            </span>
            <span className="tracking-[0.2em]">PRISM</span>
          </Link>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handlePasswordReset} className="mt-6 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Back to sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{ background: "var(--gradient-sunset)", filter: "blur(80px)" }}
      />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2 self-center font-semibold">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-prism)" }}
          >
            <Layers className="h-4 w-4" />
          </span>
          <span className="tracking-[0.2em]">PRISM</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to PRISM</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to let PRISM refract your context into your next move.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <Button
              onClick={handleAppleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {appleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Continue with Apple
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or email{" "}
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignInEmail} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-in">Email</Label>
                  <Input
                    id="email-in"
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-in">Password</Label>
                  <Input
                    id="pw-in"
                    type="password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    Forgot password?
                  </button>
                </p>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUpEmail} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name-up">Your name</Label>
                  <Input
                    id="name-up"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-up">Password</Label>
                  <Input
                    id="pw-up"
                    type="password"
                    minLength={6}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
