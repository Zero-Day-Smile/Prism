import { supabase } from "../supabase/client";

type PrismOAuthResult = | { success: true } | { error: { message: string } | Error };


function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error && "message" in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(String(error));
}

export const prismOAuth = {
  auth: {
    signInWithGoogle: async (): Promise<PrismOAuthResult> => {
      // Supabase requires an OAuth client secret on the server (configured in Supabase dashboard).
      // If it's missing, Supabase will return a provider/secret validation error.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) return { error };
      // `data` is typically a redirect result; we only need to return success to the UI.
      return { success: true };
    },

    signInWithOAuth: async (
      provider: "google" | "apple",
      opts?: { redirectUri?: string },
    ): Promise<PrismOAuthResult> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirectUri ?? `${window.location.origin}/auth`,
        },
      });

      if (error) return { error };
      return { success: true };
    },

    // Helper to surface clearer errors in the UI.
    signInWithGoogleVerbose: async (): Promise<PrismOAuthResult> => {
      try {
        return await prismOAuth.auth.signInWithGoogle();
      } catch (e) {
        return { error: normalizeError(e) };
      }
    },
  },
};

