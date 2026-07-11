export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages: ChatMessage[];
  responseJson?: boolean;
  temperature?: number;
  model?: string;
}

export interface AIResponse {
  content: string;
  provider: string;
}

export interface AIProvider {
  name: string;
  generate(request: AIRequest): Promise<AIResponse>;
}
