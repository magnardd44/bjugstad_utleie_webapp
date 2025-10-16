// azure/function/src/functions/timer_cat.ts
import { app, InvocationContext, Timer } from "@azure/functions";
import { ensureMachinesTable, upsertMachines } from "../shared/db";
import { fetchAllCatMachines } from "../services/cat";

app.timer("timer_cat", {
    // run every 15 minutes at second 5 to de-sync from Hydrema’s second 0
    schedule: "0 */15 * * * *",
    runOnStartup: false,
    handler: async (_: Timer, ctx: InvocationContext): Promise<void> => {
        const stamp = new Date().toISOString();
        ctx.log(`timer_cat fired at ${stamp}`);

        try {
            ctx.log(`Ensuring schema...`);
            await ensureMachinesTable();
            ctx.log(`Schema OK`);

            const machines = await fetchAllCatMachines();

            const namesLine = machines.map(m => m.name ?? `id:${m.id}`).join(", ");
            const withGeo = machines.filter(m => (m as any).geo?.time != null).length;
            ctx.log(`Machines: ${namesLine}`);
            ctx.log(`Machines with geo: ${withGeo}/${machines.length}`);

            const rows = machines.map((m: any) => ({
                id: String(m.id),
                name: m.name ?? null,
                oem_name: m.oemName ?? "CAT",
                last_pos_reported_at: m.geo?.time != null ? new Date(Number(m.geo.time)) : null,
                last_pos_latitude: m.geo?.latitude ?? null,
                last_pos_longitude: m.geo?.longitude ?? null,
            }));

            const affected = await upsertMachines(rows);
            ctx.log(`CAT: fetched ${machines.length}; upserted ${affected}.`);
        } catch (err: any) {
            ctx.error?.(`timer_cat error: ${err?.message || err}`);
            if (err?.stack) ctx.log(err.stack);
        }
    },
});
