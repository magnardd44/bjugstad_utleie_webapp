// lib/machines.ts
import { cache } from "react";
import { query } from "@/lib/db";
import type { MachinesFC, MachineFeature } from "@/types/machines";
import { IS_DEV } from "./constants";

// Fetch all machines with a known position from the DB,
// and return as a GeoJSON FeatureCollection.
// Cached for the duration of the serverless function instance,
// so subsequent calls during the same request (e.g. RSC + API route)
// or subsequent requests (if the instance is reused) are fast.
export const getMachinesFC = cache(async (): Promise<MachinesFC> => {
    const label = `[machines] query ${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    if (IS_DEV) {
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

        if (IS_DEV) {
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

        if (IS_DEV) {
            console.log("[machines] FeatureCollection to be provided to client:");
            console.dir(fc, { depth: null });
        }

        return fc;
    } finally {
        if (IS_DEV) console.timeEnd(label);
    }
});
