import { NextRequest } from "next/server";
import { z } from "zod";
import { checkContent } from "@/utils/contentFilter";
import { createGroq } from "@ai-sdk/groq";
import { streamText, type LanguageModel } from "ai";


const BodySchema = z.object({
  content:         z.string().min(1).max(500),
  courseLanguage:  z.enum(["en","es","fr","de","ja","ko","zh","pt","it","ru"]).default("en"),
  authorId:        z.string().default("user-123"),
  cefrLevel:       z.enum(["A1","A2","B1","B2","C1"]).default("A2"),
  studentName:     z.string().optional(),
  customBlocklist: z.array(z.string()).default([]),
});


const LANG: Record<string, string> = {
  en:"English", es:"Spanish", fr:"French", de:"German",
  ja:"Japanese", ko:"Korean", zh:"Mandarin", pt:"Portuguese",
  it:"Italian",  ru:"Russian",
};


const CEFR: Record<string, string> = {
  A1:"beginner",A2:"elementary",B1:"intermediate",
  B2:"upper-intermediate",C1:"advanced",
};


const enc = new TextEncoder();
function sse(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}


function wordBlocked(text: string, word: string): boolean {
  const w = word.trim().toLowerCase();
  if (!w || w.length < 2) return false;
  const t = text.toLowerCase();
  if (w.includes(" ")) return t.includes(w);
  return new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(t);
}


export async function POST(req: NextRequest): Promise<Response> {
  let raw: unknown;
  try { raw = await req.json(); }
  catch { return Response.json({ error:"Invalid JSON" }, { status:400 }); }

  const p = BodySchema.safeParse(raw);
  if (!p.success) return Response.json({ error:"Validation failed", details:p.error.flatten() }, { status:422 });

  const { content, courseLanguage, cefrLevel, customBlocklist } = p.data;

  const sr = checkContent(content);
  if (sr.status === "blocked") {
    return Response.json({
      error:"MODERATION_ERROR",
      reason:`Your message has been blocked.${sr.matchedWord ? ` ("${sr.matchedWord}")` : ""}`,
    }, { status:422 });
  }

  const hit = customBlocklist.find((w) => wordBlocked(content, w));
  if (hit) {
    return Response.json({
      error:"MODERATION_ERROR",
      reason:`Your message was blocked due to classroom policy violations. ("${hit.trim()}")`,
    }, { status:422 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith("gsk_xxx")) {
    return Response.json({
      error:"CONFIG_ERROR",
      reason:"GROQ_API_KEY not found. Please add your actual key to the .env.local file.",
    }, { status:500 });
  }

  const groq   = createGroq({ apiKey });
  const model  = groq("llama-3.3-70b-versatile") as unknown as LanguageModel;
  const lang   = LANG[courseLanguage] ?? courseLanguage;
  const level  = CEFR[cefrLevel] ?? cefrLevel;

  const system = `You are Coach Lina, a friendly ${lang} tutor in a Duolingo AI classroom.
The student is ${level} level (CEFR ${cefrLevel}).

IMPORTANT RULES:
- Always respond in ${lang}.
- Keep replies SHORT: 1-3 sentences only.
- If the student writes in English or another language, gently correct them and respond in ${lang}.
- Correct grammar mistakes using [corrected: fix] inline.
- End with one short follow-up question to keep conversation going.
- This is a K-12 classroom. Stay on topic and keep content appropriate.`;

  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        const result = streamText({
          model,
          system,
          messages:[{ role:"user", content }],
          temperature: 0.7,
          maxOutputTokens: 300,
          abortSignal: req.signal,
        });

        let total = "";
        for await (const chunk of result.textStream) {
          total += chunk;
          ctrl.enqueue(sse("delta", { delta: chunk }));
        }

        if (!total.trim()) {
          const fallback = `¡Hola! Let's practice ${lang} together. What would you like to talk about?`;
          ctrl.enqueue(sse("delta", { delta: fallback }));
          total = fallback;
        }

        const usage = await result.usage;
        ctrl.enqueue(sse("done", {
          model: "llama-3.3-70b-versatile",
          latencyMs: 0,
          usage: {
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
          },
        }));
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          ctrl.enqueue(sse("error", { message:"Generation stopped." }));
        } else {
          const msg = err instanceof Error ? err.message : "Groq error";
          ctrl.enqueue(sse("error", { message: msg }));
        }
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers:{
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
