"use client";

import { useEffect, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { MessageSchema, type MessageInput } from "@/app/schemas/message.schema";
import { useClassroomChat } from "@/app/hooks/useClassroomChat";
import { AIResponse } from "@/components/AIResponse";
import { RoleManager } from "@/components/RoleManager";
import type { ContentSafetyStatus, SupportedLanguage } from "@/app/types/chat";
import type { ClassroomMessage } from "@/app/hooks/useClassroomChat";


const LANGUAGES: Record<SupportedLanguage, { label: string; flag: string }> = {
  en: { label: "English",   flag: "🇬🇧" },
  es: { label: "Español",   flag: "🇪🇸" },
  fr: { label: "Français",  flag: "🇫🇷" },
  de: { label: "Deutsch",   flag: "🇩🇪" },
  ja: { label: "日本語",     flag: "🇯🇵" },
  ko: { label: "한국어",     flag: "🇰🇷" },
  zh: { label: "中文",       flag: "🇨🇳" },
  pt: { label: "Português", flag: "🇵🇹" },
  it: { label: "Italiano",  flag: "🇮🇹" },
  ru: { label: "Русский",   flag: "🇷🇺" },
};

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
type CefrLevel = (typeof CEFR_LEVELS)[number];

const STATUS_META: Record<ContentSafetyStatus, { label: string; color: string }> = {
  safe:    { label: "safe",    color: "var(--color-leaf)" },
  flagged: { label: "flagged", color: "#92710f" },
  blocked: { label: "blocked", color: "var(--color-clay)" },
};

const CHAR_LIMIT = 500;


export function MessageForm() {
  const {
    messages,
    streamingText,
    isActive,
    isSending,
    errorMessage,
    sendMessage,
    abort,
    clearError,
  } = useClassroomChat();

  const bottomRef = useRef<HTMLDivElement>(null);
  const cefrRef   = useRef<CefrLevel>("A2");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MessageInput>({
    resolver: zodResolver(MessageSchema) as Resolver<MessageInput>,
    defaultValues: { courseLanguage: "es", authorId: "user-123" },
  });

  const courseLanguage = watch("courseLanguage") as SupportedLanguage;
  const content        = watch("content") ?? "";
  const charCount      = content.length;
  const isOverLimit    = charCount > CHAR_LIMIT;

  async function onSubmit(data: MessageInput) {
    if (isActive || isOverLimit) return;
    await sendMessage({
      content:        data.content,
      courseLanguage: data.courseLanguage as SupportedLanguage,
      authorId:       data.authorId,
      cefrLevel:      cefrRef.current,
    });
    reset({ content: "", courseLanguage: data.courseLanguage, authorId: data.authorId });
  }

  return (
    <div className="flex flex-1 flex-col items-center px-3 py-6 sm:py-10">
      <div
        className="flex w-full max-w-xl flex-1 flex-col overflow-hidden rounded-[28px] border"
        style={{
          background:  "var(--color-canvas)",
          borderColor: "var(--color-canvas-line)",
          boxShadow:   "0 1px 2px rgba(27,58,43,0.06), 0 18px 40px -20px rgba(27,58,43,0.25)",
          minHeight:   "640px",
          position:    "relative",
        }}
      >
        {}
        <header
          className="px-5 pb-4 pt-5 sm:px-7 sm:pt-6"
          style={{ background: "var(--color-forest)" }}
        >
          {}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="flex items-center gap-2 font-display text-xl font-bold text-white sm:text-2xl">
              <span aria-hidden="true" className="text-2xl sm:text-3xl">🦉</span>
              Duolingo AI
            </h1>

            <div className="flex items-center gap-2 ml-auto">
              {}
              <select
                defaultValue="A2"
                onChange={(e) => { cefrRef.current = e.target.value as CefrLevel; }}
                aria-label="CEFR level"
                className="rounded-lg px-2 py-1 text-xs font-bold outline-none"
                style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "none" }}
              >
                {CEFR_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>

              {}
              <RoleManager />

              {}
              {isActive && (
                <div
                  className="flex items-center gap-1.5 rounded-full px-2 py-1"
                  style={{ background: "rgba(255,255,255,0.10)" }}
                  aria-live="polite"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: "var(--color-leaf-bright)",
                      animation: "pulseDot 1.2s ease-in-out infinite",
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-white/80">
                    {isSending ? "Thinking…" : "Typing…"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {}
          <div
            className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto pb-1"
            role="radiogroup"
            aria-label="Practice language"
          >
            {(Object.keys(LANGUAGES) as SupportedLanguage[]).map((code) => {
              const selected = code === courseLanguage;
              return (
                <label
                  key={code}
                  className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: selected ? "var(--color-leaf-bright)" : "rgba(255,255,255,0.07)",
                    color:      selected ? "var(--color-forest-deep)" : "rgba(255,255,255,0.7)",
                  }}
                >
                  <input
                    {...register("courseLanguage")}
                    type="radio"
                    value={code}
                    className="sr-only"
                  />
                  <span aria-hidden="true">{LANGUAGES[code].flag}</span>
                  {LANGUAGES[code].label}
                </label>
              );
            })}
          </div>
        </header>

        {}
        <div
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          style={{ scrollBehavior: "smooth" }}
          role="log"
          aria-label="Conversation"
          aria-live="polite"
        >
          {messages.length === 0 && !streamingText ? (
            <EmptyState language={LANGUAGES[courseLanguage]} />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {}
              {isSending && !streamingText && <TypingIndicator />}

              {}
              {streamingText && <StreamingBubble text={streamingText} />}
            </div>
          )}
          <div ref={bottomRef} aria-hidden="true" />
        </div>

        {}
        {errorMessage && (
          <div
            className="mx-4 mb-2 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
            style={{ background: "#fdeee8", color: "var(--color-clay)", border: "1px solid #f2c4ae" }}
            role="alert"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={clearError}
              className="ml-3 font-bold leading-none"
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
        )}

        {}
        <div
          className="border-t px-4 py-4 sm:px-6"
          style={{ borderColor: "var(--color-canvas-line)", background: "#fffdf7" }}
        >
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div
              className="flex items-end gap-2 rounded-2xl border-2 p-2 transition-colors focus-within:border-[var(--color-sky,#38bdf8)]"
              style={{
                borderColor: errors.content || isOverLimit
                  ? "var(--color-clay)"
                  : "var(--color-canvas-line)",
                background: "#ffffff",
              }}
            >
              <textarea
                {...register("content")}
                rows={1}
                disabled={isActive}
                placeholder={
                  isActive
                    ? "Coach Lina is typing…"
                    : `Write in ${LANGUAGES[courseLanguage].label}…`
                }
                aria-label="Message"
                className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isActive && !isOverLimit) handleSubmit(onSubmit)();
                  }
                }}
              />

              {}
              <span
                className="hidden flex-shrink-0 pb-2 text-[11px] font-semibold sm:inline"
                style={{ color: isOverLimit ? "var(--color-clay)" : "rgba(0,0,0,0.35)" }}
                aria-label={`${charCount} of ${CHAR_LIMIT} characters`}
              >
                {charCount}/{CHAR_LIMIT}
              </span>

              {}
              {isActive ? (
                <button
                  type="button"
                  onClick={abort}
                  aria-label="Stop generation"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-transform active:translate-y-[1px]"
                  style={{ background: "var(--color-clay,#c0392b)", boxShadow: "0 3px 0 #7a1a00" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <rect width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isOverLimit}
                  aria-label="Send message"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-transform active:translate-y-[1px] disabled:opacity-50"
                  style={{
                    background: "var(--color-leaf-bright,#58cc02)",
                    boxShadow: "0 3px 0 var(--color-forest-deep,#0f2419)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              )}
            </div>

            {}
            <div className="mt-2 min-h-[18px] px-1" role="alert" aria-live="polite">
              {errors.content && (
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-clay)" }}>
                  <span aria-hidden="true">●</span> {errors.content.message}
                </span>
              )}
              {!errors.content && isOverLimit && (
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-clay)" }}>
                  <span aria-hidden="true">●</span> Message cannot exceed {CHAR_LIMIT} characters
                </span>
              )}
            </div>
          </form>

          <p className="mt-1 text-center text-[11px] opacity-50">
            Enter to send · Shift+Enter new line · Role switcher → top right of header
          </p>
        </div>
      </div>
    </div>
  );
}


function EmptyState({ language }: { language: { label: string; flag: string } }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: "var(--color-gold-soft,#fff8e1)" }}
        aria-hidden="true"
      >
        {language.flag}
      </div>
      <p className="font-display text-base font-bold" style={{ color: "var(--color-forest-deep,#0f2419)" }}>
        Start your {language.label} lesson
      </p>
      <p className="mt-1.5 max-w-[240px] text-sm leading-relaxed opacity-60">
        Write something and Coach Lina will reply in {language.label},
        correct your grammar, and keep you practising.
      </p>
    </div>
  );
}


function MessageBubble({ message }: { message: ClassroomMessage }) {
  const isUser = message.role === "user";
  const meta   = STATUS_META[message.safetyStatus];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex-shrink-0 text-xl" aria-hidden="true">🦉</div>
      )}

      <div
        className="w-fit max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]"
        style={{
          background:              isUser ? "var(--color-forest,#1b3a2b)" : "#e9e9ec",
          borderBottomRightRadius: isUser  ? "4px" : undefined,
          borderBottomLeftRadius:  !isUser ? "4px" : undefined,
        }}
      >
        {}
        <p
          className="break-words text-sm leading-relaxed m-0"
          style={{ color: isUser ? "#fff" : "var(--color-ink,#1a1a1a)" }}
        >
          {isUser
            ? message.content
            : <AIResponse content={message.content} />
          }
        </p>

        <p
          className="mt-0.5 text-xs font-medium m-0"
          style={{ color: isUser ? "rgba(255,255,255,0.50)" : meta.color }}
        >
          {isUser ? message.timeLabel : meta.label}
        </p>
      </div>
    </div>
  );
}

function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-start">
      <div className="mr-2 mt-1 flex-shrink-0 text-xl" aria-hidden="true">🦉</div>
      <div
        className="w-fit max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]"
        style={{ background: "#e9e9ec", borderBottomLeftRadius: "4px" }}
      >
        {}
        <p
          className="break-words text-sm leading-relaxed m-0"
          style={{ color: "var(--color-ink,#1a1a1a)" }}
          aria-live="polite"
          aria-label="Coach Lina is typing"
        >
          <AIResponse content={text} streaming={true} />
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="Coach Lina is thinking">
      <div className="mr-2 mt-1 flex-shrink-0 text-xl" aria-hidden="true">🦉</div>
      <div
        className="flex items-center gap-1.5 rounded-2xl px-4 py-3"
        style={{ background: "#e9e9ec", borderBottomLeftRadius: "4px" }}
      >
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: "rgba(0,0,0,0.3)",
              animationDelay: `${delay}ms`,
              animation: "pulseDot 1.2s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
