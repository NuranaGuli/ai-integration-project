"use client";

import { getDynamicBannedWords } from "@/utils/contentFilter";

import { useCallback, useRef, useState } from "react";
import type { ContentSafetyStatus, SupportedLanguage } from "@/app/types/chat";

export type MessageRole = "user" | "coach";

export interface ClassroomMessage {
  id: string;
  role: MessageRole;
  content: string;
  safetyStatus: ContentSafetyStatus;
  language: SupportedLanguage;
  createdAt: string;
  timeLabel: string;
}

export interface GrammarFeedback {
  corrected: string;
  errors: Array<{ original: string; fix: string; explanation: string }>;
  encouragement: string;
}

export type ChatStatus =
  | { type: "idle" }
  | { type: "sending" }          
  | { type: "streaming" }        
  | { type: "error"; message: string };

export interface SendOptions {
  content: string;
  courseLanguage: SupportedLanguage;
  authorId?: string;
  cefrLevel?: "A1" | "A2" | "B1" | "B2" | "C1";
  studentName?: string;
  topic?: string;
}


interface DeltaPayload  { delta: string }
interface DonePayload   { model: string; latencyMs: number; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
interface ErrorPayload  { message: string }

function timeLabel(): string {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function makeId(): string {
  return crypto.randomUUID();
}

function parseSseFrame(frame: string): { event: string; data: unknown } | null {
  const eventMatch = frame.match(/^event:\s*(\w+)/m);
  const dataMatch  = frame.match(/^data:\s*(.+)$/m);
  if (!dataMatch) return null;
  let data: unknown;
  try { data = JSON.parse(dataMatch[1]); } catch { return null; }
  return { event: eventMatch?.[1] ?? "message", data };
}


export function useClassroomChat() {
  const [messages,      setMessages]      = useState<ClassroomMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status,        setStatus]        = useState<ChatStatus>({ type: "idle" });

  const abortRef = useRef<AbortController | null>(null);

  const isSending   = status.type === "sending";
  const isStreaming  = status.type === "streaming";
  const isActive     = isSending || isStreaming;
  const errorMessage = status.type === "error" ? status.message : null;

  const abort = useCallback((): void => {
    abortRef.current?.abort();
    setStreamingText("");
    setStatus({ type: "idle" });
  }, []);


  const clearError = useCallback((): void => {
    setStatus({ type: "idle" });
  }, []);


  const sendMessage = useCallback(async (opts: SendOptions): Promise<void> => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus({ type: "sending" });
    setStreamingText("");

    const userMsg: ClassroomMessage = {
      id:           makeId(),
      role:         "user",
      content:      opts.content,
      safetyStatus: "safe",
      language:     opts.courseLanguage,
      createdAt:    new Date().toISOString(),
      timeLabel:    timeLabel(),
    };
    setMessages((prev) => [...prev, userMsg]);

    let response: Response;
    try {
      response = await fetch("/api/chat/stream", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content:           opts.content,
          courseLanguage:    opts.courseLanguage,
          authorId:          opts.authorId ?? "user-123",
          cefrLevel:         opts.cefrLevel ?? "A2",
          studentName:       opts.studentName,
          topic:             opts.topic,
          customBlocklist:   getDynamicBannedWords(),
        }),
        signal: abortRef.current.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus({ type: "idle" });
        return;
      }
      setStatus({ type: "error", message: "Couldn't reach the classroom. Check your connection." });
      return;
    }

    if (!response.ok) {
      let reason = `Server error ${response.status}.`;
      try {
        const payload = await response.json() as { reason?: string; error?: string };
        reason = payload.reason ?? payload.error ?? reason;
      } catch {}
      setStatus({ type: "error", message: reason });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      setStatus({ type: "error", message: "Response body is not readable." });
      return;
    }

    const decoder = new TextDecoder();
    let buffer    = "";
    let assembled = "";

    try {
      setStatus({ type: "streaming" });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          if (!frame.trim()) continue;
          const parsed = parseSseFrame(frame);
          if (!parsed) continue;

          switch (parsed.event) {
            case "delta": {
              const { delta } = parsed.data as DeltaPayload;
              assembled += delta;
              setStreamingText(assembled);
              break;
            }

            case "done": {
              const meta = parsed.data as DonePayload;
              setStreamingText("");

              if (assembled.trim()) {
                const coachMsg: ClassroomMessage = {
                  id:           makeId(),
                  role:         "coach",
                  content:      assembled,
                  safetyStatus: "safe",
                  language:     opts.courseLanguage,
                  createdAt:    new Date().toISOString(),
                  timeLabel:    timeLabel(),
                };
                setMessages((prev) => [...prev, coachMsg]);
              }

              setStatus({ type: "idle" });
              console.info(`[Groq] ${meta.model} · ${meta.latencyMs}ms`);
              break;
            }

            case "error": {
              const { message } = parsed.data as ErrorPayload;
              setStreamingText("");
              setStatus({ type: "error", message });
              break;
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setStreamingText("");
        setStatus({ type: "idle" });
      } else {
        setStreamingText("");
        setStatus({ type: "error", message: "Stream interrupted. Please try again." });
      }
    } finally {
      reader.releaseLock();
      setStatus((prev) =>
        prev.type === "streaming" || prev.type === "sending"
          ? { type: "idle" }
          : prev,
      );
    }
  }, []);

  return {
    messages,
    streamingText,
    status,
    isSending,
    isStreaming,
    isActive,
    errorMessage,
    sendMessage,
    abort,
    clearError,
  };
}
