import { AIProvider, AIRequest, AIResponse } from "../types";
import { getApiKey } from "../router.server";

export class GroqProvider implements AIProvider {
  readonly name = "groq";

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = getApiKey("groq");
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY");
    }

    const modelName =
      request.model &&
      !request.model.includes("gemini") &&
      !request.model.includes("llama")
        ? request.model
        : "openai/gpt-oss-20b";

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

    let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    // If Groq strict JSON validation fails (400 code), retry without strict response_format
    if (!response.ok && body.response_format) {
      delete body.response_format;
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
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
      throw new Error("Groq returned empty response");
    }

    return {
      content: text,
      provider: this.name,
    };
  }
}
