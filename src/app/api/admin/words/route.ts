import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addServerWord,
  removeServerWord,
  getServerWords,
  serverWordStore,
} from "@/utils/serverWordStore";

const WordSchema = z.object({
  word: z
    .string()
    .min(2, "Söz ən azı 2 simvol olmalıdır")
    .max(50, "Söz 50 simvoldan çox ola bilməz")
    .transform((w) => w.trim().toLowerCase()),
});

function checkRole(req: NextRequest): boolean {
  const role = req.headers.get("x-user-role");
  return role === "admin" || role === "moderator" || role === "teacher";
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Bu əməliyyat üçün moderator rolu tələb olunur." },
    { status: 403 },
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!checkRole(req)) return forbidden();
  return NextResponse.json({ ok: true, data: { words: getServerWords(), count: serverWordStore.size } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkRole(req)) return forbidden();

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Keçərsiz JSON." }, { status: 400 }); }

  const parsed = WordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { word } = parsed.data;
  if (serverWordStore.has(word)) {
    return NextResponse.json({ ok: false, error: `"${word}" is already on the list.` }, { status: 409 });
  }

  addServerWord(word);
  return NextResponse.json(
    { ok: true, data: { added: word, total: serverWordStore.size } },
    { status: 201 },
  );
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!checkRole(req)) return forbidden();

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Keçərsiz JSON." }, { status: 400 }); }

  const parsed = WordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { word } = parsed.data;
  if (!serverWordStore.has(word)) {
    return NextResponse.json({ ok: false, error: `"${word}" tapılmadı.` }, { status: 404 });
  }

  removeServerWord(word);
  return NextResponse.json({ ok: true, data: { removed: word, total: serverWordStore.size } });
}
