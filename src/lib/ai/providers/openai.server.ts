import { AIProvider, AIRequest, AIResponse } from "../types";
import { getApiKey } from "../router.server";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = getApiKey("openai");
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    const modelName =
      request.model && !request.model.includes("gemini") ? request.model : "gpt-4o-mini";

    const body: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      response_format?: { type: "json_object" };
    } = {
      model: modelName,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.responseJson) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (text === undefined || text === null) {
      throw new Error("OpenAI returned empty response");
    }

    return {
      content: text,
      provider: this.name,
    };
  }
}
