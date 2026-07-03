import type { SupportedLanguage } from "@/app/types/chat";

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface GenerationConfig {
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_CONFIG: GenerationConfig = {
  temperature: 0.7,
  maxTokens: 512,
};


export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  latencyMs: number;
  model: string;
}

export type StreamCallback = (delta: string, done: boolean) => void;


export interface ProviderCapabilities {
  streaming: boolean;
  maxContextTokens: number;
  nativeModeration: boolean;
}

export interface ILLMProvider {
  readonly id: string;

  readonly capabilities: ProviderCapabilities;

  complete(
    messages: LLMMessage[],
    config?: Partial<GenerationConfig>,
    signal?: AbortSignal,
  ): Promise<LLMResponse>;

  stream(
    messages: LLMMessage[],
    onChunk: StreamCallback,
    config?: Partial<GenerationConfig>,
    signal?: AbortSignal,
  ): Promise<LLMResponse>;
}

export class LLMProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly statusCode?: number,
    public readonly isRateLimit: boolean = statusCode === 429,
    cause?: unknown,
  ) {
    super(message);
    this.name = "LLMProviderError";
    this.cause = cause;
  }
}

export interface LearnerContext {
  language: SupportedLanguage;
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1";
  topic?: string;
  studentName?: string;
}
