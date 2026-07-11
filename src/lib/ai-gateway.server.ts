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

export function extractJson<T = unknown>(raw: string): T {
  // Try direct parse first, then strip code fences.
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1]) as T;
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last > first) return JSON.parse(raw.slice(first, last + 1)) as T;
    throw new Error("Could not parse JSON from AI response");
  }
}
