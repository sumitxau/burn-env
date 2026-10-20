import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const secret = await prisma.secret.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isBurned: true,
        burnedAt: true,
        expiresAt: true,
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

    return NextResponse.json({
      status: "READY",
      title: secret.title,
      expiresAt: secret.expiresAt,
    });
  } catch (error) {
    console.error("Failed to fetch secret status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
