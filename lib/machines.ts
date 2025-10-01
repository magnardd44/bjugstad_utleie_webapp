// lib/machines.ts
import { cache } from "react";
import { query } from "@/lib/db";
import type { MachinesFC, MachineFeature } from "@/types/machines";

const DEV = process.env.NODE_ENV !== "production";

export const getMachinesFC = cache(async (): Promise<MachinesFC> => {
    const label = `[machines] query ${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    if (DEV) {
        console.time(label);
        console.log("[machines] Starting DB query…");
    }

    try {
        const { rows } = await query(`
      SELECT
        id,
        name,
        last_pos_reported_at,
        last_pos_latitude  AS lat,
        last_pos_longitude AS lng
      FROM machines
      WHERE last_pos_latitude IS NOT NULL
        AND last_pos_longitude IS NOT NULL
      ORDER BY name;
    `);

        if (DEV) {
            console.log(`[machines] DB returned ${rows.length} rows`);
            console.dir(rows, { depth: null });
        }

        const features: MachineFeature[] = rows.map((m: any): MachineFeature => {
            const reportedAt: string | null = m.last_pos_reported_at
                ? new Date(m.last_pos_reported_at).toISOString()
                : null;

            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [Number(m.lng), Number(m.lat)],
                },
                properties: {
                    id:
                        typeof m.id === "number" || typeof m.id === "string"
                            ? m.id
                            : String(m.id),
                    name: String(m.name ?? ""),
                    last_pos_reported_at: reportedAt,
                },
            };
        });

        const fc: MachinesFC = { type: "FeatureCollection", features };

        if (DEV) {
            console.log("[machines] FeatureCollection to be provided to client:");
            console.dir(fc, { depth: null });
        }

        return fc;
    } finally {
        if (DEV) console.timeEnd(label);
    }
});
