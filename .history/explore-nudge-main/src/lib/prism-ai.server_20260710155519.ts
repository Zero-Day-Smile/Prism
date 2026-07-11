import { callLovableAI, extractJson } from "./ai-gateway.server";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Wrapper to avoid exposing Lovable-branded naming.
export async function callPrismAI(opts: {
  model?: string;
  messages: ChatMessage[];
  responseJson?: boolean;
  temperature?: number;
}): Promise<string> {
  return callLovableAI({
    model: opts.model,
    messages: opts.messages,
    responseJson: opts.responseJson,
    temperature: opts.temperature,
  });
}

export { extractJson };

