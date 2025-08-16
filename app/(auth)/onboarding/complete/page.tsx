// app/(auth)/onboarding/complete/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CompleteOnboarding() {
  const { status } = useSession(); // requires <SessionProvider> in your root layout
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;

    const draft = localStorage.getItem("onboarding");
    if (!draft) {
      // No draft → send back to onboarding
      router.replace("/onboarding");
      return;
    }

    (async () => {
      const res = await fetch("/api/onboarding/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: draft,
      });

      if (res.ok) {
        localStorage.removeItem("onboarding");
        router.replace("/avtaler"); // go to app
      } else {
        const t = await res.text();
        setError(t || "Kunne ikke fullføre onboarding.");
      }
    })();
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-6 text-center">
        <p className="text-lg">Fullfører onboarding…</p>
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    </main>
  );
}
