import { AIRequest, AIResponse, AIProvider } from "./types";
import { GeminiProvider } from "./providers/gemini.server";
import { OpenAIProvider } from "./providers/openai.server";
import { GroqProvider } from "./providers/groq.server";

declare global {
  var __CF_ENV__: Record<string, string | undefined> | undefined;
}

const providers: Record<string, AIProvider> = {
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
  groq: new GroqProvider(),
};

const TIMEOUT_MS = 15000; // 15 seconds timeout per attempt
const MAX_RETRIES = 1; // 1 retry (2 attempts total) per provider

export function getApiKey(provider: string): string | undefined {
  const envName = `${provider.toUpperCase()}_API_KEY`;
  const viteEnvName = `VITE_${envName}`;

  // 1. Check Cloudflare Worker env parameters stored globally
  if (typeof globalThis !== "undefined" && globalThis.__CF_ENV__) {
    const cfEnv = globalThis.__CF_ENV__;
    if (cfEnv[envName]) return cfEnv[envName];
    if (cfEnv[viteEnvName]) return cfEnv[viteEnvName];
  }

  // 2. Check process.env (Node/Nitro server)
  if (typeof process !== "undefined" && process.env) {
    if (process.env[envName]) return process.env[envName];
    if (process.env[viteEnvName]) return process.env[viteEnvName];
  }

  // 3. Check import.meta.env (Vite context)
  try {
    const metaEnv = (
      import.meta as unknown as { env: Record<string, string | undefined> }
    ).env;
    if (metaEnv) {
      if (metaEnv[envName]) return metaEnv[envName];
      if (metaEnv[viteEnvName]) return metaEnv[viteEnvName];
    }
  } catch {
    // import.meta.env is only available in environments compiled/processed by Vite.
    // In Node.js/CLI environments, it throws. We ignore it.
  }

  return undefined;
}

export function isProviderConfigured(name: string): boolean {
  return !!getApiKey(name);
}

export function determineProvider(request: AIRequest): string {
  const systemMessage = request.messages.find((m) => m.role === "system")?.content || "";
  const userMessage = request.messages.find((m) => m.role === "user")?.content || "";
  const allText = (systemMessage + " " + userMessage).toLowerCase();

  // Long-form writing -> OpenAI
  if (
    allText.includes("story") ||
    allText.includes("cinematic") ||
    allText.includes("day-in-the-life")
  ) {
    return "openai";
  }

  // Quick responses -> Groq
  if (
    allText.includes("nearby essentials") ||
    allText.includes("nearbyintel") ||
    allText.includes("open_now_guess")
  ) {
    return "groq";
  }

  // Default travel planning, itineraries, summaries -> Gemini
  return "gemini";
}

async function tryProviderWithRetry(
  provider: AIProvider,
  request: AIRequest
): Promise<AIResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      console.log(
        `[AI Router] Calling provider '${provider.name}' (Attempt ${attempt}/${MAX_RETRIES + 1})...`
      );
      const startTime = Date.now();

      const response = await Promise.race([
        provider.generate(request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), TIMEOUT_MS)
        ),
      ]);

      const duration = Date.now() - startTime;
      console.log(
        `[AI Router] Provider '${provider.name}' succeeded in ${duration}ms.`
      );
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      console.error(
        `[AI Router] Provider '${provider.name}' failed on attempt ${attempt}/${MAX_RETRIES + 1}: ${err.message}`
      );
    }
  }

  throw lastError || new Error(`Provider '${provider.name}' failed after all retries`);
}

export async function routeRequest(request: AIRequest): Promise<AIResponse> {
  const primaryProvider = determineProvider(request);
  console.log(
    `[AI Router] Preferred primary provider: '${primaryProvider}' based on routing rules.`
  );

  // Build candidate order starting with preferred primary provider
  const fallbackOrder = ["gemini", "openai", "groq"];
  const candidateNames = [primaryProvider];
  for (const name of fallbackOrder) {
    if (!candidateNames.includes(name)) {
      candidateNames.push(name);
    }
  }

  // Filter candidates to only those that are configured with an API key
  const configuredCandidates = candidateNames.filter(isProviderConfigured);

  if (configuredCandidates.length === 0) {
    // Generate list of available environment keys for debugging
    const filterFn = (k: string) =>
      k.includes("KEY") || k.includes("API") || k.includes("URL") || k.includes("SUPABASE") || k.includes("GEMINI") || k.includes("OPENAI") || k.includes("GROQ");

    const formatKeys = (obj: Record<string, string | undefined> | undefined) =>
      Object.keys(obj || {})
        .filter(filterFn)
        .map((k) => `${k} (len: ${String(obj?.[k] ?? "").length})`);

    const processKeys = formatKeys(process.env);
    const cfKeys = formatKeys(globalThis.__CF_ENV__);
    let metaKeys: string[] = [];
    try {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        metaKeys = formatKeys(metaEnv);
      }
    } catch {}

    const debugInfo = `process.env: [${processKeys.join(", ")}], CF env: [${cfKeys.join(", ")}], import.meta.env: [${metaKeys.join(", ")}]`;
    console.error(`[AI Router] No AI providers are configured. ${debugInfo}`);

    throw new Error(
      `No AI providers are configured. Please set at least one of GEMINI_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY in your .env file and restart your server. Debug Info: ${debugInfo}`
    );
  }

  console.log(
    `[AI Router] Configured providers in fallback order: ${configuredCandidates.join(" -> ")}`
  );

  let lastError: Error | null = null;
  for (const name of configuredCandidates) {
    const provider = providers[name];
    if (!provider) {
      continue;
    }

    try {
      const response = await tryProviderWithRetry(provider, request);
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      console.error(
        `[AI Router] Provider '${name}' failed. Falling back to next configured provider if available.`
      );
    }
  }

  console.error(`[AI Router] All configured providers failed. Last error: ${lastError?.message || lastError}`);
  throw new Error(`AI service unavailable: ${lastError?.message || "All configured providers failed"}`);
}
