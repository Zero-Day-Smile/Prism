// This file is generated. Do not edit it directly.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(", ")}.`;
      console.error(`[Supabase] ${message}`);
    }

    let userId = "anon";
    let token = "";

    try {
      const request = getRequest();
      const authHeader =
        request?.headers?.get("authorization") || request?.headers?.get("x-supabase-auth");

      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "").trim();
      }
    } catch {}

    const supabase = createClient<Database>(
      SUPABASE_URL || "https://spvnlrchkqvmmqcegbae.supabase.co",
      SUPABASE_PUBLISHABLE_KEY || "sb_publishable_1UKZSYZkeREBXoBCHpmv8g_npKZBnUG",
      {
        global: {
          fetch: createSupabaseFetch(
            SUPABASE_PUBLISHABLE_KEY || "sb_publishable_1UKZSYZkeREBXoBCHpmv8g_npKZBnUG",
          ),
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token);
        if (data?.user?.id) {
          userId = data.user.id;
        }
      } catch {}
    }

    return next({
      context: {
        supabase,
        userId,
        claims: null,
      },
    });
  },
);
