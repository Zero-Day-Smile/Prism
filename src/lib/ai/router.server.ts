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

const providerFailures: Record<string, { timestamp: number; isFatal: boolean }> = {};
const FAILED_COOLDOWN_MS = 5 * 60 * 1000; // 5 minute cooldown for failing providers

function isFatalError(errMessage: string): boolean {
  const lower = errMessage.toLowerCase();
  return (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("404") ||
    lower.includes("500") ||
    lower.includes("502") ||
    lower.includes("503") ||
    lower.includes("504") ||
    lower.includes("quota") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("invalid_api_key") ||
    lower.includes("insufficient_quota") ||
    lower.includes("model_not_found")
  );
}

function isProviderHealthy(name: string): boolean {
  if (!isProviderConfigured(name)) return false;
  const failure = providerFailures[name];
  if (!failure) return true;
  // If cooldown passed, re-test
  if (Date.now() - failure.timestamp > FAILED_COOLDOWN_MS) {
    delete providerFailures[name];
    return true;
  }
  // Skip if within cooldown
  return false;
}

export function determineProvider(request: AIRequest): string {
  // Always prefer Groq as it is active, fast, and healthy
  return "groq";
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
      // Clear failure record on success
      delete providerFailures[provider.name];
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      console.error(
        `[AI Router] Provider '${provider.name}' failed on attempt ${attempt}/${MAX_RETRIES + 1}: ${err.message}`
      );

      const fatal = isFatalError(err.message);
      if (fatal) {
        providerFailures[provider.name] = { timestamp: Date.now(), isFatal: true };
        console.warn(
          `[AI Router] Provider '${provider.name}' encountered fatal error. Entering cooldown for 5m.`
        );
        break; // Do not retry fatal errors
      }
    }
  }

  throw lastError || new Error(`Provider '${provider.name}' failed after retries`);
}

export async function routeRequest(request: AIRequest): Promise<AIResponse> {
  const primaryProvider = determineProvider(request);
  console.log(
    `[AI Router] Preferred primary provider: '${primaryProvider}' based on routing rules.`
  );

  // Build candidate order: preferred primary, then Groq (fastest), Gemini, OpenAI
  const fallbackOrder = ["groq", "gemini", "openai"];
  const candidateNames = [primaryProvider];
  for (const name of fallbackOrder) {
    if (!candidateNames.includes(name)) {
      candidateNames.push(name);
    }
  }

  // Filter candidates to only those that are configured and healthy (or fallback to any configured)
  let activeCandidates = candidateNames.filter(isProviderHealthy);
  if (activeCandidates.length === 0) {
    // If all healthy options exhausted, try any configured provider
    activeCandidates = candidateNames.filter(isProviderConfigured);
  }

  if (activeCandidates.length === 0) {
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
    `[AI Router] Active candidate providers: ${activeCandidates.join(" -> ")}`
  );

  let lastError: Error | null = null;
  for (const name of activeCandidates) {
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
        `[AI Router] Provider '${name}' failed. Falling back to next candidate.`
      );
    }
  }

  console.error(`[AI Router] All candidate providers failed. Last error: ${lastError?.message || lastError}`);
  throw new Error(`AI service unavailable: ${lastError?.message || "All candidate providers failed"}`);
}
