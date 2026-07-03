"use client";

import DOMPurify from "isomorphic-dompurify";
import { useMemo } from "react";


const PURIFY_CONFIG = {
  ALLOWED_TAGS:  ["mark", "br", "span"],
  ALLOWED_ATTR:  ["style", "class", "aria-hidden"],
  ALLOW_DATA_ATTR: false,
  FORBID_ATTR:   ["onerror", "onload", "onclick", "onmouseover"],
} as const;


function applyCorrections(raw: string): string {
  return raw
    .replace(/\n/g, "<br>")
    .replace(
      /\[corrected:\s*([^\]]{1,200})\]/g,
      (_match, correction: string) =>
        `<mark style="background:#fef9c3;color:#3f2e00;border-radius:4px;padding:0 5px;font-weight:600;font-size:0.92em">${correction.trim()}</mark>`,
    );
}


function sanitizeLLMOutput(raw: string): string {
  if (typeof raw !== "string" || raw.length === 0) return "";
  const withMarkup = applyCorrections(raw);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return DOMPurify.sanitize(withMarkup, PURIFY_CONFIG as any) as unknown as string;
}


const CURSOR_HTML =
  '<span aria-hidden="true" style="display:inline-block;width:2px;height:1em;background:var(--color-forest,#1b3a2b);margin-left:3px;vertical-align:text-bottom;animation:cursorBlink 0.9s step-end infinite"></span>';


interface AIResponseProps {
  content: string;
  streaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
}


export function AIResponse({ content, streaming = false, className, style }: AIResponseProps) {
  const safeHTML = useMemo(() => {
    const s = sanitizeLLMOutput(content);
    return streaming ? s + CURSOR_HTML : s;
  }, [content, streaming]);

  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: safeHTML }}
      aria-live={streaming ? "polite" : undefined}
    />
  );
}

export function useSanitizedHTML(raw: string): string {
  return useMemo(() => sanitizeLLMOutput(raw), [raw]);
}
