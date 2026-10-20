import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const secret = await prisma.secret.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        isBurned: true,
        burnedAt: true,
        expiresAt: true,
        webhookUrl: true,
      },
    });

    if (!secret) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    if (secret.isBurned) {
      return NextResponse.json(
        { status: "BURNED", burnedAt: secret.burnedAt },
        { status: 410 }
      );
    }

    if (new Date() > secret.expiresAt) {
      await prisma.secret.update({
        where: { id },
        data: { content: null },
      });
      return NextResponse.json({ status: "EXPIRED" }, { status: 410 });
    }

    const rawContent = secret.content;

    // Erase content from DB immediately
    await prisma.secret.update({
      where: { id },
      data: {
        content: null,
        isBurned: true,
        burnedAt: new Date(),
      },
    });

    // Optional webhook notification
    if (secret.webhookUrl) {
      fetch(secret.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `BurnEnv: Secret ${secret.id} was viewed and destroyed.`,
        }),
      }).catch((err) => {
        console.error("Webhook notification failed:", err);
      });
    }

    return NextResponse.json({ content: rawContent }, { status: 200 });
  } catch (error) {
    console.error("Failed to burn secret:", error);
    return NextResponse.json(
      { error: "Failed to burn secret" },
      { status: 500 }
    );
  }
}
