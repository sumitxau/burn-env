import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSecretSchema } from "@/validators/secret";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSecretSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { content, expiresInMinutes, title, webhookUrl } = parsed.data;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const secret = await prisma.secret.create({
      data: {
        content,
        expiresAt,
        title: title || null,
        webhookUrl: webhookUrl || null,
      },
      select: { id: true, expiresAt: true },
    });

    return NextResponse.json(secret, { status: 201 });
  } catch (error) {
    console.error("Failed to create secret:", error);
    return NextResponse.json(
      { error: "Failed to create secret" },
      { status: 500 }
    );
  }
}
