// azure/function/src/functions/timer_cat.ts
import { app, InvocationContext, Timer } from "@azure/functions";
import { MachineRow, upsertMachines } from "../shared/db";
import { fetchAllCatMachines } from "../services/cat";

app.timer("timer_cat", {
    // run every 15 minutes at second 0 to de-sync from Hydrema’s second 0
    schedule: "0 */15 * * * *",
    runOnStartup: true,
    handler: async (_: Timer, ctx: InvocationContext): Promise<void> => {
        const stamp = new Date().toISOString();
        ctx.log(`timer_cat fired at ${stamp}`);

        try {
            const machines = await fetchAllCatMachines();

            const namesLine = machines.map(m => m.name ?? `id:${m.id}`).join(", ");
            const withGeo = machines.filter(m => (m as any).geo?.time != null).length;
            //ctx.log(`Machines: ${namesLine}`);
            //ctx.log(`Machines with geo: ${withGeo}/${machines.length}`);

            const rows: MachineRow[] = machines.map((m: any) => ({
                id: String(m.id),
                name: m.name ?? null,
                oem_name: m.oemName ?? "CAT",
                last_pos_reported_at: m.geo?.time != null ? new Date(Number(m.geo.time)) : null,
                last_pos_latitude: m.geo?.latitude ?? null,
                last_pos_longitude: m.geo?.longitude ?? null,
            }));

            const affected = await upsertMachines(rows);
            //ctx.log(`CAT: fetched ${machines.length}; upserted ${affected}.`);
            //ctx.log(`all machines: ${JSON.stringify(rows)}`);
        } catch (err: any) {
            ctx.error?.(`timer_cat error: ${err?.message || err}`);
            if (err?.stack) ctx.log(err.stack);
        }
    },
});