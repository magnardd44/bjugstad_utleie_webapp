// app/(auth)/onboarding/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TermsDialog from "@/components/TermsDialog";

export default function OnboardingPage() {
    const { status, update } = useSession();
    const router = useRouter();

    const [company, setCompany] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hideError, setHideError] = useState(false);

    useEffect(() => {
        if (status === "loading") return; // wait for session fetch
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setHideError(false);

        const res = await fetch("/api/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company, acceptedTermsVersion: "v1" }),
        });

        if (res.ok) {
            await update({
                acceptedTerms: true,
                company,
                // include any other fields that were collected in the form/API
            });
            router.replace("/avtaler");
            router.refresh();
        } else {
            setError("Kunne ikke lagre opplysninger.");
            setSubmitting(false);
        }
    }

    const canSubmit = company.trim().length > 0 && accepted && !submitting;

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#001a4d] via-[#002c6d] to-[#1c1464] p-6">
            <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur p-8 text-white shadow-xl">
                {/* Error banner (same style as login page) */}
                {error && !hideError && (
                    <div className="mb-4 rounded-lg bg-red-500/15 ring-1 ring-red-400/40 p-3 text-sm text-red-100">
                        <div className="flex items-start gap-2">
                            <span className="flex-1">{error}</span>
                            <button
                                aria-label="Lukk feil"
                                className="cursor-pointer text-red-200 hover:text-white"
                                onClick={() => setHideError(true)}
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                <h1 className="text-2xl font-semibold mb-2">Velkommen</h1>
                <p className="text-sm opacity-80 mb-6">
                    Før du kan bruke portalen trenger vi et par opplysninger.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 opacity-90">
                            Selskap
                        </label>
                        <input
                            placeholder="Selskapsnavn"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="w-full rounded-xl bg-white/90 text-slate-900 placeholder-slate-500 px-3 py-2.5 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-orange-400/70 transition"
                            autoComplete="organization"
                        />
                    </div>

                    <label className="flex items-start gap-3 text-sm leading-5">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-white/40 bg-white/10 text-orange-500 focus:ring-orange-400 cursor-pointer"
                        />
                        <span className="opacity-90">
                            Jeg godtar{" "}
                            <button
                                type="button"
                                onClick={() => setShowTerms(true)}
                                className="underline underline-offset-2 hover:text-white cursor-pointer"
                            >
                                vilkår og betingelser
                            </button>
                            .
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 transition py-3 font-medium disabled:opacity-60 disabled:hover:bg-orange-500 cursor-pointer"
                    >
                        {submitting ? "Lagrer…" : "Bekreft"}
                    </button>

                    <TermsDialog open={showTerms} onClose={() => setShowTerms(false)} />
                </form>
            </div>
        </main>
    );
}
