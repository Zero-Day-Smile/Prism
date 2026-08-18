import { AIProvider, AIRequest, AIResponse } from "../types";
import { getApiKey } from "../router.server";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = getApiKey("gemini");
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    // Default to gemini-3.6-flash (current stable)
    let modelName = "gemini-3.6-flash";

    if (request.model) {
      // Handle prefixes like "google/gemini-3-flash-preview"
      const parts = request.model.split("/");
      const baseModel = parts[parts.length - 1];
      if (baseModel.includes("gemini")) {
        modelName = baseModel;
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemMessage = request.messages.find((m) => m.role === "system")?.content;
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: {
      contents: Array<{
        role: string;
        parts: Array<{ text: string }>;
      }>;
      systemInstruction?: {
        parts: Array<{ text: string }>;
      };
      generationConfig?: {
        temperature?: number;
        responseMimeType?: string;
      };
    } = {
      contents,
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage }],
      };
    }

    const generationConfig: {
      temperature?: number;
      responseMimeType?: string;
    } = {};

    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }
    if (request.responseJson) {
      generationConfig.responseMimeType = "application/json";
    }
    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned empty response or invalid format");
    }

    return {
      content: text,
      provider: this.name,
    };
  }
}
