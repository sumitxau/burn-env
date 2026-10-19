"use client";

import { useState } from "react";
import { Copy, Check, Lock, Clock, ShieldAlert, ArrowRight, RefreshCw, KeyRound, ChevronDown } from "lucide-react";

export default function GeneratorPage() {
  const [content, setContent] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState(15);
  const [title, setTitle] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please paste your .env or secret content first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          expiresInMinutes: Number(expiresInMinutes),
          title: title.trim() || undefined,
          webhookUrl: webhookUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate secret link");
      }

      setCreatedId(data.id);
      // Security measure: wipe the raw keys from state immediately
      setContent("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Network error connecting to API");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const shareUrl = typeof window !== "undefined" && createdId ? `${window.location.origin}/s/${createdId}` : "";

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCreatedId(null);
    setContent("");
    setTitle("");
    setWebhookUrl("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 sm:p-12 font-sans selection:bg-zinc-800">
      <div className="max-w-2xl w-full mx-auto space-y-8 my-auto">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
            <Lock className="w-3.5 h-3.5 text-zinc-300" />
            <span>End-to-End Ephemeral Vault</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            BurnEnv
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Share environment variables and credentials that automatically vaporize from the database the instant they are revealed.
          </p>
        </div>

        {/* State A: Link Created Card */}
        {createdId ? (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 text-emerald-400">
              <KeyRound className="w-5 h-5" />
              <h2 className="text-lg font-medium text-white">Your One-Time Link is Ready</h2>
            </div>

            <p className="text-xs text-zinc-400">
              Send this link to your recipient. Once opened and revealed, the secret keys will be permanently wiped from the server.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-mono text-zinc-200 select-all outline-none focus:border-zinc-700"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-semibold transition shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-4 flex gap-3 items-start text-xs text-zinc-400">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-zinc-300">Bot-Safe Protection:</span> Discord, Slack, and WhatsApp crawlers can safely preview this link without triggering premature destruction.
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Create Another Secret</span>
            </button>
          </div>
        ) : (
          /* State B: Generator Form */
          <form
            onSubmit={handleSubmit}
            className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur"
          >
            {error && (
              <div className="rounded-lg bg-red-950/40 border border-red-900/60 p-3.5 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Secret Content Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Secret Payload (.env / keys / JSON)</span>
                <span className="text-[11px] text-zinc-500 font-mono">Max 25k chars</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="DATABASE_URL=postgresql://user:pass@host:5432/db&#10;STRIPE_SECRET_KEY=sk_live_...&#10;NEXTAUTH_SECRET=xyz..."
                rows={8}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 font-mono text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-zinc-700 resize-y"
                required
              />
            </div>

            {/* Expiration Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Self-Destruct Lifetime</span>
              </label>
              <select
                value={expiresInMinutes}
                onChange={(e) => setExpiresInMinutes(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-200 outline-none focus:border-zinc-700"
              >
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>

            {/* Optional Collapsible Settings */}
            <div className="border-t border-zinc-800/60 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1.5 transition"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                <span>Optional Settings (Title, Discord Webhook)</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Label / Title (optional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Supabase Production Keys"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-zinc-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Discord Webhook Alert (optional)</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Generating Vault Link...</span>
              ) : (
                <>
                  <span>Create Self-Destruct Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-600 font-mono">
        Zero plain-text persistence. Tombstone records on destroy.
      </div>
    </div>
  );
}
