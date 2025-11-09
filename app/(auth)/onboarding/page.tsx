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

    console.log("OnboardingPage: session status =", status);

    useEffect(() => {
        console.log("session status ===", status);
        if (status === "loading") return;   // wait for session fetch
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);


    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        const res = await fetch("/api/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company, acceptedTermsVersion: "v1" }),
        });
        if (res.ok) {
            await update({
                acceptedTerms: true,
                company
                // include any other fields that were collected in the form/API
            });
            router.replace("/avtaler");
            //router.refresh();
        } else {
            setError("Kunne ikke lagre opplysninger.");
            setSubmitting(false);
        }
    }


    return (
        <main className="min-h-screen grid place-items-center p-6">
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
                <h1 className="text-2xl font-semibold">Velkommen</h1>
                <input
                    placeholder="Selskap"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                />
                <label className="flex items-start gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span>
                        Jeg godtar{" "}
                        <button type="button" onClick={() => setShowTerms(true)} className="underline">
                            vilkår og betingelser
                        </button>
                        .
                    </span>
                </label>
                {error && <p className="text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={!company.trim() || !accepted || submitting}
                    className="w-full rounded-md bg-orange-500 py-2 text-white disabled:opacity-60"
                >
                    Bekreft
                </button>
                <TermsDialog open={showTerms} onClose={() => setShowTerms(false)} />
            </form>
        </main>
    );
}
