// app/api/machines/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const revalidate = 1200; // cache on the edge/server for 20 min

export async function GET() {
    const { rows } = await query(`
    SELECT id, name, oem_name, first_seen, last_updated, last_pos_reported_at,
           last_pos_latitude  AS lat,
           last_pos_longitude AS lng
    FROM machines
    ORDER BY name;
  `);
    return NextResponse.json({ machines: rows });
}
