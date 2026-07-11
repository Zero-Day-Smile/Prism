import { supabase } from "../supabase/client";



export const prismOAuth = {
  auth: {
    signInWithGoogle: async () => {
      // Use Supabase-native OAuth to avoid Lovable /~oauth/* initiation endpoints.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) return { error };
      return { success: true };
    },

    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft",
      opts?: { redirectUri?: string },
    ) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirectUri ?? `${window.location.origin}/auth`,
        },
      });

      if (error) return { error };
      return { success: true };
    },
  },
};

