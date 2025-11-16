// azure/function/src/functions/timer_cat.ts
import { app, InvocationContext, Timer } from "@azure/functions";
import { MachineRow, upsertMachines } from "../shared/db";
import { fetchAllCatMachines } from "../services/cat";

app.timer("timer_cat", {
    // run every 15 minutes at second 0 to de-sync from Hydrema’s second 0
    schedule: "0 */15 * * * *",
    runOnStartup: false,
    handler: async (_: Timer, ctx: InvocationContext): Promise<void> => {
        const stamp = new Date().toISOString();
        ctx.log(`timer_cat fired at ${stamp}`);

        try {
            const machines = await fetchAllCatMachines();

            const rows: MachineRow[] = machines
                .map((asset): MachineRow | null => {
                    const equipmentHeader = asset.EquipmentHeader;
                    if (!equipmentHeader) return null;

                    // Prefer EquipmentID, fall back to SerialNumber
                    const key = equipmentHeader.EquipmentID ?? equipmentHeader.SerialNumber;
                    if (!key) return null; // require at least one

                    const loc = asset.Location;
                    const last_pos_reported_at = loc?.Datetime ? new Date(loc.Datetime) : null;

                    return {
                        id: `CAT:${key}`,
                        name: key,
                        oem_name: equipmentHeader.OEMName ?? "CAT",
                        last_pos_reported_at: last_pos_reported_at,
                        last_pos_latitude: loc?.Latitude ?? null,
                        last_pos_longitude: loc?.Longitude ?? null,
                    };
                })
                .filter((r): r is MachineRow => !!r);

            const affected = await upsertMachines(rows);
            ctx.log(`CAT: fetched ${machines.length}; upserted ${affected}.`);
        } catch (err: any) {
            ctx.error?.(`timer_cat error: ${err?.message || err}`);
            throw (err instanceof Error ? err : new Error(String(err)));

        }
    },
});