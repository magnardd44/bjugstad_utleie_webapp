// azure/function/src/functions/timer_hydrema.ts
import { app, InvocationContext, Timer } from "@azure/functions";
import { ensureMachinesTable, upsertMachines } from "../shared/db";
import { fetchAllMachines } from "../services/hydrema";

app.timer("timer_hydrema", {
    // Azure Functions cron format: {second} {minute} {hour} {day} {month} {day-of-week}
    // Run at second 0, every 15th minute:
    schedule: "5 */15 * * * *",

    handler: async (myTimer: Timer, ctx: InvocationContext): Promise<void> => {
        const stamp = new Date().toISOString();
        ctx.log(`timer_hydrema fired at ${stamp}`);

        try {
            ctx.log(`Ensuring schema...`);
            await ensureMachinesTable();
            ctx.log(`Schema OK`);

            // 2) Fetch machines from Hydrema (now includes geo=true, see hydrema.ts patch below)
            const machines = await fetchAllMachines();

            // Log names (fallback to id). Also show how many have geo.
            const namesLine = machines.map(m => m.name ?? `id:${m.id}`).join(", ");
            const withGeo = machines.filter(m => (m as any).geo?.time != null).length;
            ctx.log(`Machines: ${namesLine}`);
            ctx.log(`Machines with geo: ${withGeo}/${machines.length}`);

            // 3) Map to DB shape (snake_case) + last position
            const rows = machines.map((m: any) => ({
                id: String(m.id),
                name: m.name ?? null,
                oem_name: m.oemName ?? null,
                last_pos_reported_at: m.geo?.time != null ? new Date(Number(m.geo.time)) : null, // ms -> Date (UTC)
                last_pos_latitude: m.geo?.latitude ?? null,
                last_pos_longitude: m.geo?.longitude ?? null,
            }));

            // 4) Upsert into DB
            const affected = await upsertMachines(rows);

            ctx.log(`Fetched ${machines.length} machines; upserted ${affected}.`);
        } catch (err: any) {
            ctx.error?.(`timer_hydrema error: ${err?.message || err}`);
            if (err?.stack) ctx.log(err.stack);
        }
    },
});
