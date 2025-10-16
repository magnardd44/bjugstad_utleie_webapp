// azure/function/src/shared/prisma.ts
// Local Prisma singleton for the Function App (duplicate of lib/prisma.ts)
import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma = g.__prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
    g.__prisma = prisma;
}
