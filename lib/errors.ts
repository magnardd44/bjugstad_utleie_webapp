// lib/errors.ts
export type AppErrorCode =
    | "MACHINES_TIMEOUT"
    | "MACHINES_NETWORK"
    | "MACHINES_AUTH"
    | "MACHINES_DB"
    | "UNKNOWN";

export type AppError = {
    code: AppErrorCode;
    title: string;
    message: string;
    /** Raw details for expandable "Vis detaljer" */
    details?: Record<string, any>;
};

export function isAppError(e: unknown): e is AppError {
    return !!e && typeof e === "object" && "code" in e && "message" in e;
}

/** Turn any thrown value into a user-friendly AppError */
export function normalizeError(e: unknown): AppError {
    // Try to pick common Node / pg fields
    const any = e as any;
    const code = (any?.code as string) || "";
    const status = Number(any?.status || any?.statusCode || 0);
    const name = any?.name as string | undefined;

    // Timeout / connect issues (like ETIMEDOUT screenshot)
    if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
        return {
            code: "MACHINES_TIMEOUT",
            title: "Tidsavbrudd mot databasen",
            message:
                "Det tok for lang tid å koble til databasen. Dette kan skje ved ustabilt nett eller midlertidig drift hos Azure.",
            details: { code, errno: any?.errno, syscall: any?.syscall, address: any?.address, port: any?.port, digest: any?.digest },
        };
    }

    // DNS / network
    if (code === "ENOTFOUND" || code === "ECONNRESET" || code === "EAI_AGAIN") {
        return {
            code: "MACHINES_NETWORK",
            title: "Nettverksfeil",
            message:
                "Klarte ikke å nå tjenesten. Sjekk nettverket ditt og prøv igjen.",
            details: { code, errno: any?.errno, syscall: any?.syscall, address: any?.address, port: any?.port },
        };
    }

    // Auth/session problems
    if (status === 401 || status === 403 || name === "AuthError") {
        return {
            code: "MACHINES_AUTH",
            title: "Mangler tilgang",
            message:
                "Økten din er utløpt eller mangler rettigheter. Logg inn på nytt for å fortsette.",
            details: { status, name, code },
        };
    }

    // PostgreSQL / query errors
    if (name === "DatabaseError" || code?.startsWith("P") /* pg */) {
        return {
            code: "MACHINES_DB",
            title: "Databasefeil",
            message:
                "En databasefeil oppstod under henting av maskindata. Prøv igjen, og kontakt oss hvis feilen vedvarer.",
            details: { name, code, detail: any?.detail, where: any?.where },
        };
    }

    // Fallback
    return {
        code: "UNKNOWN",
        title: "Uventet feil",
        message:
            "Noe gikk galt under lasting av data. Prøv på nytt. Dersom feilen vedvarer, kontakt support.",
        details: { name, code, status, message: any?.message, stack: any?.stack },
    };
}
