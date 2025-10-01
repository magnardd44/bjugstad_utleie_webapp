"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMachinesState } from "./MachinesContext";
import ErrorPanel from "./ErrorPanel";
import Spinner from "@/components/Spinner";

export default function MachinesGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const state = useMachinesState();
    const [isPending, startTransition] = useTransition();

    // While a refresh is pending, show the same centered spinner you use at first load
    if (isPending) {
        return (
            <section className="min-h-[60vh] grid place-items-center">
                <Spinner label="Laster på nytt…" />
            </section>
        );
    }

    if (state.status === "error") {
        return (
            <ErrorPanel
                error={state.error}
                withSidebar
                title="Klarte ikke laste maskindata"
                onRetry={() => {
                    // Run refresh inside a transition -> switches UI to spinner immediately
                    startTransition(() => {
                        router.refresh();
                    });
                }}
            />
        );
    }

    return <>{children}</>;
}
