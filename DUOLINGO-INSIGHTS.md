# DUOLINGO-INSIGHTS.md
## AI Integration Engineering

---

## 1. Project Overview

This project extends the original **03 Ai Integration** ai-integration-project with a complete AI tutoring backend. The existing Zod validation schemas, TypeScript types, and Error Boundary components are preserved exactly — the AI layer is added on top without breaking any existing contracts.

**What was added:**

| Layer | Files |
|---|---|
| LLM Service Abstraction | `src/services/llm/provider.interface.ts`, `groq.service.ts` |
| Prompt Engineering | `src/services/prompts/templates.ts` |
| Streaming API | `src/app/api/chat/stream/route.ts` |
| Streaming Hook | `src/app/hooks/useClassroomChat.ts` |
| Updated UI | `src/app/components/forms/MessageForm.tsx` |

---

## 2. LLM Provider Choice: Why Groq

**Groq** was selected as the primary provider for the following reasons:

- **Free tier**: ~14,400 requests/day with no credit card required
- **Speed**: Groq's LPU (Language Processing Unit) hardware delivers the fastest inference available for open models — typical first-token latency under 200 ms
- **Model quality**: `llama-3.3-70b-versatile` (Meta's Llama 3.3, 70B parameters) produces coherent, multilingual, pedagogically appropriate responses
- **SDK availability**: `@ai-sdk/groq` integrates cleanly with the Vercel AI SDK (`ai@6`) already in the project

**Alternative: Ollama (local)**

For fully offline testing, `OllamaService` can be activated by setting `OLLAMA_BASE_URL=http://localhost:11434/v1`. It uses the same `@ai-sdk/openai` adapter pointed at Ollama's OpenAI-compatibility layer, requiring zero additional dependencies.

**SDK version note:** `@ai-sdk/groq@3` returns a `LanguageModelV3` type while `ai@6` internally expects `LanguageModelV4`. These are structurally identical at runtime — the `as unknown as LanguageModel` cast in `groq.service.ts` is intentional and safe.

---

## 3. Provider Abstraction Layer

### `provider.interface.ts`

Defines a single `ILLMProvider` interface that every adapter must implement:

```typescript
interface ILLMProvider {
  id: string;
  capabilities: ProviderCapabilities;
  complete(messages, config?, signal?): Promise<LLMResponse>;
  stream(messages, onChunk, config?, signal?): Promise<LLMResponse>;
}
```

This means swapping from Groq to any other provider (OpenAI, Anthropic, Ollama) requires only writing a new adapter class — no changes to the route handler, hook, or UI.

### `groq.service.ts`

The Groq adapter handles:
- **API key validation** at call time with a clear error message pointing to `console.groq.com`
- **Token usage normalisation**: `ai@6` renamed `promptTokens/completionTokens` to `inputTokens/outputTokens` — the adapter maps these back to our internal `TokenUsage` shape
- **Error wrapping**: All SDK errors are caught and re-thrown as `LLMProviderError` with the original status code preserved (e.g., `429 Too Many Requests` sets `isRateLimit: true`)
- **Singleton export**: `groqService` is a module-level singleton so route handlers never construct multiple instances

---

## 4. Prompt Engineering Strategy

### `templates.ts` — Five Template Functions

#### `buildTutorSystemMessage(ctx: LearnerContext)`
The primary template used for every conversation turn. Encodes:
- Coach persona (Coach Lina — warm, encouraging, Duolingo-style)
- Target language in plain English (e.g., "Spanish")
- CEFR level with a plain-language descriptor:
  - `A1` → "absolute beginner — simple words and phrases only"
  - `A2` → "elementary — basic sentences and familiar topics"
  - `B1` → "intermediate — can handle routine situations"
  - `B2` → "upper-intermediate — nuanced discussion on abstract topics"
  - `C1` → "advanced — fluent and precise communication"
- Grammar correction instruction: inline `[corrected: …]` markers
- K-12 safety constraint: strictly on-topic, no off-topic content

#### `buildGrammarCorrectionMessages()`
Returns a structured JSON prompt requesting:
```json
{ "corrected": "...", "errors": [...], "encouragement": "..." }
```
The UI renders `[corrected: …]` markers as gold highlight badges using `highlightCorrections()` in `MessageForm.tsx`.

#### `buildRoleplayMessages()`
Selects from a bank of 30 scenarios (3 per language × 10 languages). Each scenario specifies a real-world setting, coach role, and student goal — forcing contextually grounded practice.

#### `buildTranslationMessages()` / `buildVocabSuggestionMessages()`
Both return structured JSON prompts for downstream parsing. Available for Step 2 / Step 3 extension.

---

## 5. Streaming Architecture

### Server-Sent Events (SSE) Protocol

```
POST /api/chat/stream
  ↓
ReadableStream → event: delta  { delta: "chunk of text" }
               → event: delta  { delta: "..." }
               → event: done   { model, latencyMs, usage }
               → (on error)
               → event: error  { message: "..." }
```

**Why SSE over WebSockets:** SSE is unidirectional (server → client), works over standard HTTP/1.1, requires no upgrade handshake, and integrates naturally with Next.js App Router `Response` objects. For a chat application where the client only needs to receive streamed tokens, SSE is simpler and more reliable.

### Pipeline in `route.ts`

```
1. req.json()              → raw body
2. StreamBodySchema.parse  → Zod validation (422 on failure)
3. getSafetyStatus()       → content safety gate (422 if blocked)
4. buildTutorSystemMessage → typed prompt construction
5. groqService.stream()    → Groq Llama 3.3 via Vercel AI SDK
6. onChunk callback        → sseFrame("delta", { delta })
7. stream complete         → sseFrame("done", { model, latencyMs, usage })
8. catch LLMProviderError  → sseFrame("error", { message })
```

The `ReadableStream` wraps `groqService.stream()` so the HTTP response begins immediately with `Content-Type: text/event-stream` — no buffering.

### SSE Consumer in `useClassroomChat.ts`

The hook uses the browser's native `ReadableStreamDefaultReader`:

```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { value, done } = await reader.read();
  buffer += decoder.decode(value, { stream: true });
  const frames = buffer.split("\n\n");
  buffer = frames.pop() ?? "";
}
```

Frame splitting on `"\n\n"` handles TCP packet boundaries correctly — a frame may arrive split across multiple `read()` calls, or multiple frames may arrive in one call. The trailing `buffer = frames.pop()` holds any incomplete frame for the next iteration.

---

## 6. AbortController — Stop Button

```typescript
const abortRef = useRef<AbortController | null>(null);

const sendMessage = async (opts) => {
  abortRef.current?.abort();        
  abortRef.current = new AbortController();
  
  response = await fetch("/api/chat/stream", {
    signal: abortRef.current.signal,  
  });
};

const abort = () => {
  abortRef.current?.abort();          
  setStreamingText("");
  setStatus({ type: "idle" });
};
```

When `abort()` fires:
- The `fetch()` request is cancelled at the network layer
- Next.js receives `req.signal.aborted === true` and `groqService.stream()` throws `AbortError`
- The `catch` block in `useClassroomChat` checks `err.name === "AbortError"` and resets to idle — no error banner shown
- Groq stops billing tokens for the incomplete generation

---

## 7. Zod Schema Validation

### Strict Continuity from Project 04

The original `MessageSchema` from `src/app/schemas/message.schema.ts` is preserved untouched:

```typescript
export const MessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(500, "Message is too long"),
  courseLanguage: z.enum(["en", "es", "fr", ...]).default("en"),
  authorId: z.string().default("user-123"),
});
```

The streaming route uses a separate, extended schema (`StreamBodySchema`) that adds AI-specific fields while sharing the same language enum and content constraints:

```typescript
const StreamBodySchema = z.object({
  content:        z.string().min(1).max(500),
  courseLanguage: z.enum([...same 10 values...]).default("en"),
  authorId:       z.string().default("user-123"),
  cefrLevel:      z.enum(["A1", "A2", "B1", "B2", "C1"]).default("A2"),
  studentName:    z.string().optional(),
  topic:          z.string().optional(),
});
```

On validation failure the route returns `422 Unprocessable Entity` with `parsed.error.flatten()` — the same error shape the original `/api/chat` route uses.

### Runtime Safety Pattern

```typescript
const parsed = StreamBodySchema.safeParse(rawBody);
if (!parsed.success) {
  return new Response(
    JSON.stringify({ error: "Validation failed.", details: parsed.error.flatten() }),
    { status: 422 }
  );
}

const { content, courseLanguage, cefrLevel } = parsed.data;
```

`safeParse` is used instead of `parse` everywhere to avoid unhandled exceptions — errors are converted to typed HTTP responses.

---

## 8. Error Handling & Fallback Strategy

### Layer 1 — Client-side (Zod + React Hook Form)
`MessageSchema` with `zodResolver` validates before any network call. Users see inline field errors immediately — no round-trip needed.

### Layer 2 — Content Safety Gate
`getSafetyStatus()` runs synchronously on the server before the LLM call. Blocked messages return `422` with `"MODERATION_ERROR"` code — Groq is never called, no tokens consumed.

### Layer 3 — LLM Provider Error
`LLMProviderError` wraps all Groq SDK failures:
- **429 Rate Limit**: `isRateLimit: true` — the error message instructs the user to wait
- **Missing API key**: Explicit message with link to `console.groq.com`
- **Network failure**: Generic message with retry instruction
- All errors arrive as `event: error` SSE frames — the stream does not hang

### Layer 4 — React Error Boundary
The existing `ErrorBoundary` class component wraps the entire `MessageForm` in `page.tsx`. If a rendering error occurs (e.g., malformed SSE data causes an unexpected state), the boundary catches it and shows "The lesson lost its place" with a "Back to class" reset button — no blank white screen.

### Layer 5 — Stream Hang Prevention
The `finally` block in `useClassroomChat.sendMessage()` always resets status:

```typescript
finally {
  reader.releaseLock();
  setStatus((prev) =>
    prev.type === "streaming" || prev.type === "sending"
      ? { type: "idle" }
      : prev
  );
}
```

Even if the `done` SSE event never arrives (e.g., the server crashes mid-stream), the UI returns to idle and re-enables the send button.

---

## 9. What Was Most Challenging

**`ai@6` breaking change — token field names**

The Vercel AI SDK v6 renamed `promptTokens/completionTokens` to `inputTokens/outputTokens` in the `usage` object returned by `streamText`. This caused silent `undefined` values. Fix: explicit mapping in `groq.service.ts`:

```typescript
function toTokenUsage(raw: { inputTokens?: number; outputTokens?: number }): TokenUsage {
  const prompt     = raw.inputTokens  ?? 0;
  const completion = raw.outputTokens ?? 0;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion };
}
```

**SSE frame splitting across TCP packets**

`TextDecoder.decode(value, { stream: true })` is essential — without `{ stream: true }`, multi-byte UTF-8 characters (e.g., Japanese, Russian) arriving split across chunks would produce garbled output. The `buffer.split("\n\n")` + `buffer = frames.pop()` pattern correctly handles frames that arrive split across multiple `read()` calls.

**`groq@3` + `ai@6` type mismatch**

`@ai-sdk/groq@3` returns `LanguageModelV3`; `ai@6`'s `streamText` expects `LanguageModelV4`. Runtime behaviour is identical — the `as unknown as LanguageModel` cast resolves the TypeScript error without any runtime impact.

---

## 10. Free Testing Setup

```bash
# 1. Get free Groq API key (30 seconds, no card)
#    https://console.groq.com → API Keys → Create API Key

# 2. Configure
cp .env.example .env.local
# Edit .env.local: set GROQ_API_KEY=gsk_...

# 3. Run
npm install
npm run dev
# → http://localhost:3001
```

**Groq free tier limits:** ~14,400 requests/day, 6,000 tokens/minute, 500,000 tokens/day. More than sufficient for classroom use and evaluation.
