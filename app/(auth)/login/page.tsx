// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import TermsDialog from "@/components/TermsDialog";

type CreateForm = {
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  phone: string;
  accepted: boolean;
};

export default function LoginPage() {
  const callbackUrl = useSearchParams().get("callbackUrl") || "/avtaler";
  const router = useRouter();
  const { status } = useSession();
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

  // If we reach here via client navigation and are already authed, leave immediately
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  async function handleLogin() {
    setLoading(true);
    if (process.env.NODE_ENV === "development") {
      // Real NextAuth session via Credentials
      await signIn("credentials", { callbackUrl });
      return;
    }
    // Production: Vipps
    await signIn("vipps", { callbackUrl });
  }


  async function handleCreate() {
    // client-side guards
    if (!form.accepted) return;
    setLoading(true);

    // Save draft for the /onboarding/complete step to persist into DB
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
            {/* Create user form (inline in the card) */}
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

            {/* Terms + link opens modal */}
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

      {/* Modal with scrollable terms */}
      <TermsDialog open={showTerms} onClose={() => setShowTerms(false)} />
    </main>
  );
}
