import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createSecretSchema } from "../validators/secret";

const prisma = new PrismaClient();
const router = Router();

// Create secret
router.post("/", async (req: Request, res: Response) => {
    try {
        const parsed = createSecretSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
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

        return res.status(201).json(secret);
    } catch {
        return res.status(500).json({ error: "Failed to create secret" });
    }
});

// Bot-safe status check (never returns secret content)
router.get("/:id/status", async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

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
            return res.status(404).json({ error: "Secret not found" });
        }

        if (secret.isBurned) {
            return res.status(410).json({ status: "BURNED", burnedAt: secret.burnedAt });
        }

        if (new Date() > secret.expiresAt) {
            await prisma.secret.update({
                where: { id },
                data: { content: null },
            });
            return res.status(410).json({ status: "EXPIRED" });
        }

        return res.status(200).json({
            status: "READY",
            title: secret.title,
            expiresAt: secret.expiresAt,
        });
    } catch {
        return res.status(500).json({ error: "Failed to fetch status" });
    }
});

// Reveal and burn secret
router.post("/:id/burn", async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

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
            return res.status(404).json({ error: "Secret not found" });
        }

        if (secret.isBurned) {
            return res.status(410).json({ status: "BURNED", burnedAt: secret.burnedAt });
        }

        if (new Date() > secret.expiresAt) {
            await prisma.secret.update({
                where: { id },
                data: { content: null },
            });
            return res.status(410).json({ status: "EXPIRED" });
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
            }).catch(() => { });
        }

        return res.status(200).json({ content: rawContent });
    } catch {
        return res.status(500).json({ error: "Failed to burn secret" });
    }
});

export default router;
