// app/(auth)/login/page.tsx
// Purpose: UI to start authentication. In prod it calls signIn("vipps"),
// which sends the user into the Vipps OAuth flow configured in lib/auth.ts.
// In dev it uses signIn("credentials") to skip Vipps.
// After successful auth, NextAuth redirects to `callbackUrl` or /onboarding/complete.

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // reads session shaped by callbacks in lib/auth.ts
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react"; // client helper that talks to /api/auth/* (handlers from lib/auth.ts)
import TermsDialog from "@/components/TermsDialog";
import { IS_DEV, USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY } from "@/lib/constants";

type CreateForm = {
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  phone: string;
  accepted: boolean;
};

export default function LoginPage() {
  // If middleware redirected here, it'll attach ?callbackUrl=...
  // After completing Vipps, NextAuth will send the user back to this path.
  const callbackUrl = useSearchParams().get("callbackUrl") || "/avtaler";
  const router = useRouter();
  const { status } = useSession(); // based on JWT/session produced by lib/auth.ts callbacks
  const [mode, setMode] = useState<"login" | "create">("login");
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [form, setForm] = useState<CreateForm>({
    firstName: "",
    lastName: "",
    company: "",
    role: "",
    phone: "",
    accepted: false,
  });

  const nameOk = form.firstName.trim().length >= 2 && form.lastName.trim().length >= 2;
  const companyOk = form.company.trim().length >= 2;
  const roleOk = form.role.trim().length >= 2;
  const phoneOk = /^\d{8}$/.test(form.phone.trim()); // 8 digits only
  const termsOk = form.accepted;

  const formValid = nameOk && companyOk && roleOk && phoneOk && termsOk;

  // If we’re already authenticated (session from NextAuth/lib/auth.ts),
  // don't show the login screen—go straight to callbackUrl.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  async function handleLogin() {
    setLoading(true);
    if (IS_DEV && USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY) {
      // Dev-only provider configured in lib/auth.ts.
      // This posts to /api/auth/signin/credentials (handled by NextAuth handlers).
      await signIn("credentials", { callbackUrl });
      return;
    }
    // Production path: kick off Vipps OAuth.
    // This posts to /api/auth/signin/vipps, which redirects to Vipps,
    // and Vipps will redirect back to /api/auth/callback/vipps (handlers from lib/auth.ts).
    await signIn("vipps", { callbackUrl });
  }

  async function handleCreate() {
    // Client-side validation only; the “create” path still authenticates via Vipps.
    if (!form.accepted) return;
    setLoading(true);

    // Stash onboarding data locally so it survives the Vipps redirect roundtrip.
    // The /onboarding/complete page should read this and persist to DB (via Prisma),
    // then set acceptedTerms on the user so the jwt/session callbacks expose it.
    localStorage.setItem(
      "onboarding",
      JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        company: form.company.trim(),
        role: form.role.trim(),
        phone: form.phone.trim(),
        acceptedTermsVersion: "v1",
      })
    );

    // After Vipps completes, land on /onboarding/complete to finish creating the user.
    await signIn("vipps", { callbackUrl: "/onboarding/complete" });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#001a4d] via-[#002c6d] to-[#1c1464] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur p-8 text-white shadow-xl">
        <h1 className="text-2xl font-semibold mb-2">
          {mode === "login" ? "Logg inn" : "Opprett bruker"}
        </h1>
        <p className="text-sm opacity-80 mb-6">
          {mode === "login"
            ? "Du må logge inn med Vipps før du kan bruke kundeportalen."
            : "Fyll inn informasjonen, godkjenn vilkårene og verifiser med Vipps."}
        </p>

        {mode === "login" ? (
          <>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 transition py-3 font-medium disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Åpner Vipps…" : "Logg inn med Vipps"}
            </button>

            <div className="mt-6 text-center text-sm">
              Ikke bruker ennå?{" "}
              <button
                onClick={() => setMode("create")}
                className="underline font-medium cursor-pointer"
              >
                Opprett bruker
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Inline "create user" details (still verified via Vipps) */}
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Fornavn"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  className="w-full rounded-md border-2 border-white/80 bg-transparent px-3 py-2 text-white placeholder-white/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                />
                <input
                  placeholder="Etternavn"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  className="w-full rounded-md border-2 border-white/80 bg-transparent px-3 py-2 text-white placeholder-white/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <input
                placeholder="Selskap"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
                className="w-full rounded-md border-2 border-white/80 bg-transparent px-3 py-2 text-white placeholder-white/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
              />
              <input
                placeholder="Rolle i selskapet"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-md border-2 border-white/80 bg-transparent px-3 py-2 text-white placeholder-white/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
              />
              <input
                placeholder="Telefon"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full rounded-md border-2 border-white/80 bg-transparent px-3 py-2 text-white placeholder-white/70 focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Terms check gates the Vipps sign-in button */}
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.accepted}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accepted: e.target.checked }))
                }
                className="mt-1 cursor-pointer"
              />
              <span>
                Jeg godtar{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="underline font-medium cursor-pointer"
                >
                  vilkår og betingelser
                </button>
                .
              </span>
            </label>

            <button
              onClick={handleCreate}
              disabled={loading || !formValid}
              className="cursor-pointer mt-4 w-full rounded-xl bg-orange-500 hover:bg-orange-600 transition py-3 font-medium disabled:opacity-60"
            >
              {loading ? "Åpner Vipps…" : "Opprett bruker og verifiser med Vipps"}
            </button>

            <div className="mt-4 text-center text-sm opacity-90">
              Allerede bruker?{" "}
              <button
                onClick={() => setMode("login")}
                className="underline font-medium cursor-pointer"
              >
                Gå til innlogging
              </button>
            </div>
          </>
        )}
      </div>

      {/* Terms are shown in a modal; separate from NextAuth/Vipps internals */}
      <TermsDialog open={showTerms} onClose={() => setShowTerms(false)} />
    </main>
  );
}
