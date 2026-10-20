"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, Unlock, Copy, Check, ShieldAlert, Clock, AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

type VaultStatus = "LOADING" | "READY" | "REVEALED" | "BURNED" | "EXPIRED" | "NOT_FOUND";

export default function VaultPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [status, setStatus] = useState<VaultStatus>("LOADING");
    const [title, setTitle] = useState<string | null>(null);
    const [burnedAt, setBurnedAt] = useState<string | null>(null);
    const [content, setContent] = useState<string | null>(null);

    const [isBurning, setIsBurning] = useState(false);
    const [copied, setCopied] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

    // 1. Initial bot-safe status check on page load
    useEffect(() => {
        if (!id) return;

        async function checkStatus() {
            try {
                const res = await fetch(`${API_URL}/api/secrets/${id}/status`);
                const data = await res.json();

                if (res.status === 200) {
                    setStatus("READY");
                    setTitle(data.title || null);
                } else if (res.status === 410) {
                    if (data.status === "BURNED") {
                        setStatus("BURNED");
                        setBurnedAt(data.burnedAt || null);
                    } else {
                        setStatus("EXPIRED");
                    }
                } else {
                    setStatus("NOT_FOUND");
                }
            } catch {
                setStatus("NOT_FOUND");
            }
        }

        checkStatus();
    }, [id, API_URL]);

    // 2. Physical reveal & atomic burn action
    const handleReveal = async () => {
        setIsBurning(true);
        try {
            const res = await fetch(`${API_URL}/api/secrets/${id}/burn`, {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                setContent(data.content);
                setStatus("REVEALED");
            } else if (res.status === 410) {
                setStatus("BURNED");
                setBurnedAt(data.burnedAt || null);
            } else {
                setStatus("NOT_FOUND");
            }
        } catch {
            setStatus("NOT_FOUND");
        } finally {
            setIsBurning(false);
        }
    };

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClearAndExit = () => {
        setContent(null);
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 sm:p-12 font-sans selection:bg-zinc-800">
            <div className="max-w-xl w-full mx-auto space-y-8 my-auto">
                {/* Brand Header */}
                <div className="text-center space-y-2">
                    <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>BurnEnv Vault</span>
                    </Link>
                </div>

                {/* State 0: Loading Status Check */}
                {status === "LOADING" && (
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-8 text-center space-y-3">
                        <div className="inline-block h-5 w-5 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                        <p className="text-xs font-mono text-zinc-400">Verifying vault signature...</p>
                    </div>
                )}

                {/* State 1: READY (Safe preview - Content is still in PostgreSQL) */}
                {status === "READY" && (
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-zinc-300" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-white">Encrypted Secret Received</h1>
                                <p className="text-xs text-zinc-400 font-mono">
                                    {title ? `Payload: "${title}"` : "Self-destructing payload enclosed"}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-300/90 space-y-1">
                            <div className="font-semibold flex items-center gap-1.5 text-amber-200">
                                <ShieldAlert className="w-4 h-4 text-amber-400" />
                                <span>Single-View Warning</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-zinc-400">
                                Clicking reveal will decrypt the secret and permanently wipe it from the server. If you refresh or leave, it cannot be recovered.
                            </p>
                        </div>

                        <button
                            onClick={handleReveal}
                            disabled={isBurning}
                            className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                        >
                            {isBurning ? (
                                <span>Decrypting & Wiping Database...</span>
                            ) : (
                                <>
                                    <Unlock className="w-4 h-4" />
                                    <span>Reveal & Destroy Secret</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* State 2: REVEALED (Secret returned one final time; DB is now NULL) */}
                {status === "REVEALED" && (
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                                <Check className="w-4 h-4" />
                                <span>DECRYPTED & WIPED FROM SERVER</span>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-mono transition"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? "Copied" : "Copy Keys"}</span>
                            </button>
                        </div>

                        <div className="relative">
                            <pre className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-200 overflow-x-auto leading-relaxed select-all max-h-96">
                                {content}
                            </pre>
                        </div>

                        <p className="text-[11px] font-mono text-zinc-500 text-center">
                            The content column for this record has been set to NULL in PostgreSQL.
                        </p>

                        <button
                            onClick={handleClearAndExit}
                            className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Clear Screen & Exit</span>
                        </button>
                    </div>
                )}

                {/* State 3A: BURNED (Tombstone Record Alert) */}
                {status === "BURNED" && (
                    <div className="bg-zinc-900/90 border border-red-900/50 rounded-xl p-6 sm:p-8 space-y-5 shadow-2xl text-center">
                        <div className="h-12 w-12 rounded-full bg-red-950/60 border border-red-900/80 flex items-center justify-center mx-auto text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-white">Security Alert: Secret Destroyed</h2>
                            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                                This secret was already accessed and permanently erased from the database.
                            </p>
                        </div>

                        {burnedAt && (
                            <div className="inline-block px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                                Destroyed timestamp: {new Date(burnedAt).toLocaleString()}
                            </div>
                        )}

                        <div className="pt-2">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-medium transition"
                            >
                                <span>Create a New Secret</span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* State 3B: EXPIRED */}
                {status === "EXPIRED" && (
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-8 space-y-4 text-center">
                        <Clock className="w-8 h-8 text-zinc-500 mx-auto" />
                        <h2 className="text-base font-medium text-white">Link Expired</h2>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                            This secret passed its expiration window without being viewed, and its contents have been automatically purged.
                        </p>
                        <Link
                            href="/"
                            className="inline-block px-4 py-2 bg-zinc-100 text-zinc-950 rounded text-xs font-medium"
                        >
                            Back to Home
                        </Link>
                    </div>
                )}

                {/* State 3C: NOT FOUND */}
                {status === "NOT_FOUND" && (
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-8 space-y-4 text-center">
                        <h2 className="text-base font-medium text-white">Vault Not Found</h2>
                        <p className="text-xs text-zinc-400">
                            This secret does not exist or has been removed.
                        </p>
                        <Link
                            href="/"
                            className="inline-block px-4 py-2 bg-zinc-100 text-zinc-950 rounded text-xs font-medium"
                        >
                            Create a Secret
                        </Link>
                    </div>
                )}
            </div>

            <footer className="text-center text-xs text-zinc-600 font-mono">
                Single-Use Secret Sharing  • Zero Persistence
            </footer>
        </div>
    );
}
