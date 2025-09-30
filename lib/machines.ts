// lib/machines.ts
import { cache } from "react";
import { query } from "@/lib/db";
import type { Feature, FeatureCollection, Point } from "geojson";

type Props = { id: string | number; name: string };
export type MachineFeature = Feature<Point, Props>;
export type MachinesFC = FeatureCollection<Point, Props>;

const DEV = process.env.NODE_ENV !== "production";

export const getMachinesFC = cache(async (): Promise<MachinesFC> => {
    console.time("[machines] query");
    console.log("[machines] Starting DB query...");

    const { rows } = await query(`
    SELECT id, name, last_pos_latitude AS lat, last_pos_longitude AS lng
    FROM machines
    WHERE last_pos_latitude IS NOT NULL AND last_pos_longitude IS NOT NULL
    ORDER BY name;
  `);

    console.timeEnd("[machines] query");
    console.log(`[machines] DB returned ${rows.length} rows`);

    if (DEV) {
        // Full dump in dev; comment this out if it’s too chatty
        console.log("[machines] Raw rows:");
        console.dir(rows, { depth: null });
    }

    const features: MachineFeature[] = rows.map((m: any): MachineFeature => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(m.lng), Number(m.lat)] },
        properties: {
            id: typeof m.id === "number" || typeof m.id === "string" ? m.id : String(m.id),
            name: String(m.name ?? ""),
        },
    }));

    const fc: MachinesFC = { type: "FeatureCollection", features };

    if (DEV) {
        console.log("[machines] FeatureCollection to be provided to client:");
        console.dir(fc, { depth: null });
    }

    return fc;
});
