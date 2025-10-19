// azure/function/src/functions/timer_hydrema.ts
import { app, InvocationContext, Timer } from "@azure/functions";
import { upsertMachines } from "../shared/db";
import { fetchAllHydremaMachines } from "../services/hydrema";

app.timer("timer_hydrema", {
    // Azure Functions cron format: {second} {minute} {hour} {day} {month} {day-of-week}
    // Run at second 0, every 15th minute:
    schedule: "5 */15 * * * *",
    runOnStartup: false,

    handler: async (myTimer: Timer, ctx: InvocationContext): Promise<void> => {
        const stamp = new Date().toISOString();
        ctx.log(`timer_hydrema fired at ${stamp}`);

        try {
            // Fetch machines from Hydrema (includes geo when available)
            const machines = await fetchAllHydremaMachines();

            // Map to DB shape (snake_case) + last position
            const rows = machines.map((m: any) => ({
                id: `HYD:${m.id}`,
                name: m.name ?? null,
                oem_name: "Hydrema",
                last_pos_reported_at: m.geo?.time != null ? new Date(Number(m.geo.time)) : null, // ms -> Date (UTC)
                last_pos_latitude: m.geo?.latitude ?? null,
                last_pos_longitude: m.geo?.longitude ?? null,
            }));

            // Upsert into DB
            const affected = await upsertMachines(rows);

            ctx.log(`Fetched ${machines.length} machines; upserted ${affected}.`);
        } catch (err: any) {
            ctx.error?.(`timer_hydrema error: ${err?.message || err}`);
            throw (err instanceof Error ? err : new Error(String(err)));
        }
    },
});
