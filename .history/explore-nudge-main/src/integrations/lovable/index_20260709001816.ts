// This file is generated. Do not modify it.


import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";
const lovableAuth = createLovableAuth();


type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type LovableOAuthProvider = "google" | "apple" | "microsoft";

export const lovable = {
  auth: {

    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft",
      opts?: SignInOptions,
    ) => {
      const result = await lovableAuth.signInWithOAuth(provider, {
        redirect_uri: opts?.redirect_uri,
        extraParams: {
          ...opts?.extraParams,
        },
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        // Lovable returns tokens in a format compatible with Supabase's setSession.
        const tokens = (result as { tokens?: unknown }).tokens;
        if (!tokens) return { error: new Error("OAuth succeeded but no tokens were returned") };

        await supabase.auth.setSession(tokens as any);
        return { ...result };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
  },
};
