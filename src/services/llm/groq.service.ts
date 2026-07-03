import { createGroq } from "@ai-sdk/groq";
import { generateText, streamText, type LanguageModel } from "ai";

import {
  DEFAULT_CONFIG,
  LLMProviderError,
  type GenerationConfig,
  type ILLMProvider,
  type LLMMessage,
  type LLMResponse,
  type ProviderCapabilities,
  type StreamCallback,
  type TokenUsage,
} from "./provider.interface";

export const GROQ_MODELS = {
  versatile: "llama-3.3-70b-versatile",
  instant: "llama-3.1-8b-instant",
  gemma: "gemma2-9b-it",
} as const;

export type GroqModelId = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];

function requireApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.trim() === "") {
    throw new LLMProviderError(
      "groq",
      "GROQ_API_KEY is not set. " +
        "Get a free key at https://console.groq.com then add it to .env.local.",
    );
  }
  return key;
}


function toTokenUsage(raw: {
  inputTokens?: number;
  outputTokens?: number;
}): TokenUsage {
  const prompt     = raw.inputTokens     ?? 0;
  const completion = raw.outputTokens    ?? 0;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion };
}


function wrapError(err: unknown, id: string): LLMProviderError {
  if (err instanceof LLMProviderError) return err;
  const message = err instanceof Error ? err.message : "Unknown Groq error";
  const status  =
    typeof err === "object" && err !== null && "status" in err
      ? (err as { status: unknown }).status
      : undefined;
  const code = typeof status === "number" ? status : undefined;
  return new LLMProviderError(id, message, code, code === 429, err);
}


export class GroqService implements ILLMProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    maxContextTokens: 32_768,
    nativeModeration: false,
  };

  private readonly modelId: GroqModelId;

  constructor(modelId: GroqModelId = GROQ_MODELS.versatile) {
    this.id      = `groq:${modelId}`;
    this.modelId = modelId;
  }


  private buildModel(): LanguageModel {
    const groq = createGroq({ apiKey: requireApiKey() });

    return groq(this.modelId) as unknown as LanguageModel;
  }


  private splitMessages(messages: LLMMessage[]): {
    system: string | undefined;
    conversation: Array<{ role: "user" | "assistant"; content: string }>;
  } {
    const system       = messages.find((m) => m.role === "system")?.content;
    const conversation = messages
      .filter((m): m is LLMMessage & { role: "user" | "assistant" } =>
        m.role === "user" || m.role === "assistant",
      )
      .map((m) => ({ role: m.role, content: m.content }));
    return { system, conversation };
  }


  async complete(
    messages: LLMMessage[],
    config: Partial<GenerationConfig> = {},
    signal?: AbortSignal,
  ): Promise<LLMResponse> {
    const cfg     = { ...DEFAULT_CONFIG, ...config };
    const started = Date.now();
    const { system, conversation } = this.splitMessages(messages);

    try {
      const { text, usage } = await generateText({
        model:          this.buildModel(),
        system,
        messages:       conversation,
        temperature:    cfg.temperature,
        maxOutputTokens: cfg.maxTokens,
        abortSignal:    signal,
      });

      return {
        content:   text,
        usage:     toTokenUsage(usage),
        latencyMs: Date.now() - started,
        model:     this.modelId,
      };
    } catch (err: unknown) {
      throw wrapError(err, this.id);
    }
  }

  async stream(
    messages: LLMMessage[],
    onChunk: StreamCallback,
    config: Partial<GenerationConfig> = {},
    signal?: AbortSignal,
  ): Promise<LLMResponse> {
    const cfg     = { ...DEFAULT_CONFIG, ...config };
    const started = Date.now();
    const { system, conversation } = this.splitMessages(messages);

    try {
      const result = streamText({
        model:          this.buildModel(),
        system,
        messages:       conversation,
        temperature:    cfg.temperature,
        maxOutputTokens: cfg.maxTokens,
        abortSignal:    signal,
      });

      let assembled = "";

      for await (const chunk of result.textStream) {
        assembled += chunk;
        onChunk(chunk, false);
      }

      onChunk("", true);

      const usage = await result.usage;

      return {
        content:   assembled,
        usage:     toTokenUsage(usage),
        latencyMs: Date.now() - started,
        model:     this.modelId,
      };
    } catch (err: unknown) {
      throw wrapError(err, this.id);
    }
  }
}

export const groqService = new GroqService(GROQ_MODELS.versatile);
