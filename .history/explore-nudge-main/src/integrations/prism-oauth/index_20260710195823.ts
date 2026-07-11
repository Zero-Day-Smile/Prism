import { supabase } from "../supabase/client";

// Wrapper to avoid exposing Lovable-branded auto-generated module paths.
// Generated Lovable module remains untouched.
import { lovable } from "../lovable";

export const prismOAuth = {
  auth: {
    signInWithGoogle: async () => {
      const result = await lovable.auth.signInWithOAuth("google", {
        // Use /auth (our route) since the app does not define /auth/callback.
        redirect_uri: `${window.location.origin}/auth`,
      });
      // Lovable returns either an immediate result (tokens set) or a redirect.
      // If it redirected, the Lovable flow will complete on the callback page.
      return result;

    },
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft",
      opts?: { redirectUri?: string },
    ) => {
      return lovable.auth.signInWithOAuth(provider, {
        redirect_uri: opts?.redirectUri ?? `${window.location.origin}/auth`,
      });
    },
  },
};
