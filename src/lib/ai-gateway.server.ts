import { routeRequest } from "./ai/index.server";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Call the provider-agnostic AI service router, returning the raw assistant text. */
export async function callLovableAI(opts: {
  model?: string;
  messages: ChatMessage[];
  responseJson?: boolean;
  temperature?: number;
}): Promise<string> {
  const response = await routeRequest({
    messages: opts.messages,
    responseJson: opts.responseJson,
    temperature: opts.temperature,
    model: opts.model,
  });
  return response.content;
}

function repairJsonString(raw: string): string {
  let s = raw.trim();

  // Strip code fences
  s = s.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // Strip JS comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

  // Extract from first { or [ to last } or ]
  const firstBrace = s.search(/[\{\[]/);
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  } else if (firstBrace !== -1) {
    s = s.slice(firstBrace);
  }

  // Remove trailing commas before closing braces/brackets
  s = s.replace(/,\s*([}\]])/g, "$1");

  // Fix unquoted property names e.g. { name: "val" } -> { "name": "val" }
  s = s.replace(/(?<=[{\s,])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');

  // Fix unescaped control characters inside strings
  s = s.replace(/[\u0000-\u001F]+/g, (match) => {
    if (match === "\n") return "\\n";
    if (match === "\r") return "\\r";
    if (match === "\t") return "\\t";
    return "";
  });

  // Repair truncated JSON structure by auto-closing string quotes and open brackets/braces
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === "\\") {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
      } else if (char === "}" || char === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    s += '"';
  }

  s = s.replace(/,\s*$/, "");

  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

function createFallbackObject<T>(raw: string): T {
  // If the prompt requested cards (discovery feed)
  if (raw.includes("cards")) {
    return { cards: [] } as unknown as T;
  }
  // If the prompt requested gems
  if (raw.includes("gems")) {
    return { gems: [] } as unknown as T;
  }
  // If the prompt requested stops (itinerary)
  if (raw.includes("stops") || raw.includes("title")) {
    return { title: "Custom Itinerary", stops: [] } as unknown as T;
  }
  // Generic object fallback
  return {} as T;
}

export function extractJson<T = unknown>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    return createFallbackObject<T>("");
  }

  // 1. Direct JSON parse
  try {
    return JSON.parse(raw) as T;
  } catch {}

  // 2. Self-healing repair parse
  try {
    const repaired = repairJsonString(raw);
    return JSON.parse(repaired) as T;
  } catch {}

  // 3. Regex extraction fallback for object or array
  try {
    const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      const repairedMatch = repairJsonString(jsonMatch[1]);
      return JSON.parse(repairedMatch) as T;
    }
  } catch {}

  console.warn("[extractJson] Unresolvable JSON output from AI. Providing fallback shape. Raw output:", raw.slice(0, 300));
  return createFallbackObject<T>(raw);
}
