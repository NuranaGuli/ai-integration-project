import { NextRequest, NextResponse } from "next/server";
import { MessageSchema } from "@/app/schemas/message.schema";
import { getSafetyStatus } from "@/app/lib/contentSafety";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = MessageSchema.parse(body);
    const safetyStatus = getSafetyStatus(validated.content);
    return NextResponse.json(
      { success: true, data: { ...validated, safetyStatus } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
