import { supabase } from "../supabase/client";

type PrismOAuthResult = { success: true } | { error: { message: string } | Error };

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
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth`,
          },
        });

        if (error) return { error };
        return { success: true };
      } catch (e) {
        return { error: normalizeError(e) };
      }
    },

    signInWithApple: async (): Promise<PrismOAuthResult> => {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo: `${window.location.origin}/auth`,
          },
        });

        if (error) return { error };
        return { success: true };
      } catch (e) {
        return { error: normalizeError(e) };
      }
    },

    signInWithOAuth: async (
      provider: "google" | "apple",
      opts?: { redirectUri?: string },
    ): Promise<PrismOAuthResult> => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: opts?.redirectUri ?? `${window.location.origin}/auth`,
          },
        });

        if (error) return { error };
        return { success: true };
      } catch (e) {
        return { error: normalizeError(e) };
      }
    },

    sendPasswordReset: async (email: string): Promise<PrismOAuthResult> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (error) return { error };
        return { success: true };
      } catch (e) {
        return { error: normalizeError(e) };
      }
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
