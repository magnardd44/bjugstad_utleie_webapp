// azure/function/src/shared/db.ts
import { Pool, PoolClient, QueryResult } from "pg";

type SSLMode = "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";

let pool: Pool | null = null;

function buildPool(): Pool {
    const host = process.env.PG_HOST!;
    const port = Number(process.env.PG_PORT || "5432");
    const database = process.env.PG_DB!;
    const user = process.env.PG_USER!;
    const password = process.env.PG_PASSWORD!;
    const max = Number(process.env.PG_POOL_MAX || "10");
    const sslMode = (process.env.PG_SSL || "require").toLowerCase() as SSLMode;

    const ssl =
        sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full"
            ? { rejectUnauthorized: false }
            : undefined;

    return new Pool({ host, port, database, user, password, max, ssl });
}

function getPool(): Pool {
    if (!pool) pool = buildPool();
    return pool;
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const p = getPool();
    const client = await p.connect();
    try {
        return await fn(client);
    } finally {
        client.release();
    }
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const p = getPool();
    return p.query(text, params);
}

export type MachineRow = {
    id: string;
    name: string | null;
    oem_name: string | null;
    last_pos_reported_at?: Date | null;
    last_pos_latitude?: number | null;
    last_pos_longitude?: number | null;
};

/**
 * Bulk UPSERT machines:
 * - insert new rows with first_seen=now(), last_updated=now()
 * - update existing rows' name, oem_name and last_updated=now()
 * - update last position *only if* we get a non-null new value (avoids wiping previous known position)
 */
export async function upsertMachines(rows: MachineRow[]): Promise<number> {
    if (!rows.length) return 0;

    const cols = [
        "id",
        "name",
        "oem_name",
        "last_pos_reported_at",
        "last_pos_latitude",
        "last_pos_longitude",
    ];
    const values: any[] = [];
    const placeholders: string[] = [];

    rows.forEach((r, i) => {
        const offset = i * cols.length;
        values.push(
            r.id,
            r.name ?? null,
            r.oem_name ?? null,
            r.last_pos_reported_at ?? null,
            r.last_pos_latitude ?? null,
            r.last_pos_longitude ?? null,
        );
        placeholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
        );
    });

    const sql = `
    INSERT INTO machines (
      id, name, oem_name, last_pos_reported_at, last_pos_latitude, last_pos_longitude
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          oem_name = EXCLUDED.oem_name,
          last_updated = now(),
          last_pos_reported_at = COALESCE(EXCLUDED.last_pos_reported_at, machines.last_pos_reported_at),
          last_pos_latitude    = COALESCE(EXCLUDED.last_pos_latitude,    machines.last_pos_latitude),
          last_pos_longitude   = COALESCE(EXCLUDED.last_pos_longitude,   machines.last_pos_longitude)
  `;

    const res = await query(sql, values);
    return res.rowCount ?? rows.length;
}
