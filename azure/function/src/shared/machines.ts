import { prisma } from "./prisma";

/** Input shape every OEM mapper should produce */
export type MachineUpsertInput = {
    id: string;
    name?: string | null;
    oemName?: string | null;
    lastPosReportedAt?: Date | null;
    lastPosLatitude?: number | null;
    lastPosLongitude?: number | null;
};

/**
 * Upsert machines using Prisma only.
 * - Processes rows in chunks inside transactions.
 * - Only overwrites last-position fields when a new non-null value is provided.
 * - `lastUpdated` is handled by the Prisma model's `@updatedAt`.
 */
export async function upsertMachines(
    rows: MachineUpsertInput[],
    chunkSize = 200
): Promise<number> {
    if (!rows.length) return 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        await prisma.$transaction(
            chunk.map((r) =>
                prisma.machine.upsert({
                    where: { id: r.id },

                    // If machine does not exist already
                    create: {
                        id: r.id,
                        name: r.name ?? null,
                        oemName: r.oemName ?? null,
                        ...(r.lastPosReportedAt != null && { lastPosReportedAt: r.lastPosReportedAt }),
                        ...(r.lastPosLatitude != null && { lastPosLatitude: r.lastPosLatitude }),
                        ...(r.lastPosLongitude != null && { lastPosLongitude: r.lastPosLongitude }),
                    },

                    // If machine exists
                    update: {
                        name: r.name ?? null,
                        oemName: r.oemName ?? null,
                        ...(r.lastPosReportedAt != null && { lastPosReportedAt: r.lastPosReportedAt }),
                        ...(r.lastPosLatitude != null && { lastPosLatitude: r.lastPosLatitude }),
                        ...(r.lastPosLongitude != null && { lastPosLongitude: r.lastPosLongitude }),
                    },
                })
            )
        );
    }
    return rows.length;
}
