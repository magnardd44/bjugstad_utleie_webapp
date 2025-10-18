// azure/function/src/services/cat.ts
// Source: https://digital.cat.com/apis/api-list/prod/iso15143-aemp-20-0#/Snapshot/getFleetSnapshot
import axios, {
    AxiosInstance,
    AxiosHeaders,
    InternalAxiosRequestConfig,
    isAxiosError,
} from "axios";
import { requireConfig } from "../shared/kv";

/** Standard OAuth2 token response */
type TokenResp = { access_token: string; token_type?: string; expires_in?: number };

let tokenCache: { token?: string; exp?: number } = {};
let http: AxiosInstance | null = null;

/** Simple uuid v4 */
function uuidv4(): string {
    return crypto.randomUUID();
}

async function getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (tokenCache.token && tokenCache.exp && tokenCache.exp - 60 > now) return tokenCache.token!;

    const tokenUrl = await requireConfig("CAT_TOKEN_URL");
    const clientId = await requireConfig("CAT_CLIENT_ID");
    const clientSecret = await requireConfig("CAT_CLIENT_SECRET");
    // The CAT API (AAD v2) expects scope to target the resource App ID URI
    // in the form: "{resource-app-id-uri}/.default".
    const scopeRaw = await requireConfig("CAT_SCOPE");

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: `${clientId}/${scopeRaw}`
    });

    const resp = await axios.post<TokenResp>(tokenUrl, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
        validateStatus: () => true,
    });

    if (resp.status >= 400) {
        const bodyTxt = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
        throw new Error(`CAT TOKEN ${tokenUrl} -> ${resp.status} ${bodyTxt}`);
    }

    const { access_token, expires_in } = resp.data;
    tokenCache = { token: access_token, exp: now + (expires_in || 3600) };
    console.log(`[cat] token ok len=${access_token?.length ?? 0}`);
    return access_token;
}

async function getHttp(): Promise<AxiosInstance> {
    if (http) return http;

    const baseURL = await requireConfig("CAT_API_BASEURL");
    http = axios.create({ baseURL, timeout: 25000 });

    http.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
        const headers = AxiosHeaders.from(cfg.headers);
        headers.set("Authorization", `Bearer ${await getToken()}`);
        headers.set("Accept", "application/json");
        headers.set("X-Cat-API-Tracking-Id", uuidv4()); // Unique ID per request
        cfg.headers = headers;
        console.log("headers set");
        console.log(`[cat] -> ${cfg.method?.toUpperCase()} ${baseURL}${cfg.url}`);
        return cfg;
    });

    // LOG FULL RESPONSE
    const LOG_FULL = 1;
    http.interceptors.response.use(
        (resp) => {
            if (LOG_FULL) {
                const urlShow =
                    (resp.request && resp.request.responseURL) ||
                    `${baseURL}${resp.config.url ?? ""}`;
                // Build a serializable snapshot
                const snapshot = {
                    url: urlShow,
                    status: resp.status,
                    headers: resp.headers,
                    data: resp.data,
                };

                const txt = JSON.stringify(snapshot, null, 2);
                console.log("FULL RESPONSE:");
                console.log(txt);
            }
            return resp;
        });


    return http;
}

/**
 * Minimal AEMP-ish asset + optional embedded geo.
 * Different OEMs vary; we keep this permissive.
 */
// TODO: Reformat to match the actual CAT response format (see FleetJson schema in https://digital.cat.com/apis/api-list/prod/iso15143-aemp-20-0#/)
export type CatMachine = {
    id: string;                     // we prefix with "CAT:" to avoid cross-OEM collisions
    name?: string | null;           // friendly name (model if nothing else)
    oemName?: string | null;        // "CAT"
    header?: {
        model?: string | null;
        equipmentId?: string | null;
        serialNumber?: string | null;
    };
    metrics?: {
        hours?: number | null; hoursAt?: number | null;         // ms
        idleHours?: number | null;
        fuelUsed?: number | null; fuelUsedAt?: number | null;
        fuelUsedLast24?: number | null; fuelUsedLast24At?: number | null;
        odometerKm?: number | null; odometerAt?: number | null;
        fuelRemainingPct?: number | null; defRemainingPct?: number | null;
        engineRunning?: boolean | null; engineAt?: number | null;
        payloadKg?: number | null; payloadAt?: number | null;
        loadCount?: number | null; loadCountAt?: number | null;
    };
    geo?: { time?: number; longitude?: number; latitude?: number };
};

/** CAT ISO 15143 "fleet" page shape (simplified) */
type CatFleetPage = {
    Links?: Array<{ Rel: string; Href: string }>;
    Equipment?: any[];
    Version?: string;
    SnapshotTime?: string;
};

function tsToMs(ts?: string | number): number | undefined {
    if (ts == null) return undefined;
    if (typeof ts === "number") return ts > 10_000_000_000 ? ts : ts * 1000;
    const v = Date.parse(ts);
    return Number.isNaN(v) ? undefined : v;
}

function mapAssetToMachine(e: any): CatMachine | null {
    const h = e?.EquipmentHeader ?? {};
    const serial = h.SerialNumber ?? null;
    const equipId = h.EquipmentID ?? null;
    if (!serial && !equipId) return null;

    const id = `CAT:${serial ?? equipId}`;
    const model = h.Model ?? null;

    const loc = e?.Location ?? {};
    const lat = loc.Latitude ?? loc.latitude;
    const lon = loc.Longitude ?? loc.longitude;
    const geo = (lat != null && lon != null)
        ? { latitude: Number(lat), longitude: Number(lon), time: tsToMs(loc.datetime) }
        : undefined;

    const m: CatMachine = {
        id,
        name: model ?? serial ?? equipId ?? null,
        oemName: "CAT",
        header: {
            model,
            equipmentId: equipId,
            serialNumber: serial,
        },
        metrics: {
            hours: e?.CumulativeOperatingHours?.Hour ?? null,
            hoursAt: tsToMs(e?.CumulativeOperatingHours?.datetime),
            idleHours: e?.CumulativeIdleHours?.Hour ?? null,

            fuelUsed: e?.FuelUsed?.FuelConsumed ?? null,
            fuelUsedAt: tsToMs(e?.FuelUsed?.datetime),
            fuelUsedLast24: e?.FuelUsedLast24?.FuelConsumed ?? null,
            fuelUsedLast24At: tsToMs(e?.FuelUsedLast24?.datetime),

            odometerKm: e?.Distance?.Odometer ?? null,
            odometerAt: tsToMs(e?.Distance?.datetime),

            fuelRemainingPct: e?.FuelRemaining?.Percent ?? null,
            defRemainingPct: e?.DEFRemaining?.Percent ?? null,

            engineRunning: e?.EngineStatus?.Running ?? null,
            engineAt: tsToMs(e?.EngineStatus?.datetime),

            payloadKg: e?.CumulativePayloadTotals?.Payload ?? null,
            payloadAt: tsToMs(e?.CumulativePayloadTotals?.datetime),

            loadCount: e?.CumulativeLoadCount?.Count ?? null,
            loadCountAt: tsToMs(e?.CumulativeLoadCount?.datetime),
        },
        geo,
    };

    return m;
}

function nextFromLinks(links?: Array<{ Rel: string; Href: string }>): string | null {
    if (!Array.isArray(links)) return null;
    const n = links.find(l => String(l.Rel).toLowerCase() === "next");
    return n?.Href ?? null;
}

/** Fetch every fleet page and map to CatMachine[] */
export async function fetchAllCatMachines(): Promise<CatMachine[]> {
    const client = await getHttp();

    let pageNum = 1;
    let url: string | null = `/fleet/${pageNum}`;
    const out: CatMachine[] = [];

    while (url) {
        try {
            const resp = await client.get<CatFleetPage>(url, { validateStatus: () => true });
            //console.log("resp", resp);
            const showUrl = resp.request?.responseURL || `${client.defaults.baseURL}${url}`;
            console.log(`[cat] <- ${resp.status} for ${showUrl}`);

            if (resp.status >= 400) {
                const bodyTxt = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
                throw new Error(`GET ${url} failed ${resp.status}: ${bodyTxt}`);
            }

            const items = resp.data?.Equipment ?? [];
            for (const raw of items) {
                const m = mapAssetToMachine(raw);
                if (m) out.push(m);
            }

            const nextAbs = nextFromLinks(resp.data?.Links);
            if (nextAbs) {
                // If absolute, use as-is; if relative, keep relative
                url = nextAbs.startsWith("http") ? nextAbs : nextAbs.replace(client.defaults.baseURL || "", "");
            } else {
                url = null;
            }
        } catch (e: any) {
            if (isAxiosError(e)) {
                const data = e.response?.data;
                console.error(
                    `[cat] axios error: status=${e.response?.status} msg=${e.message} body=${typeof data === "string" ? data : JSON.stringify(data)}`
                );
            }
            throw e;
        }

        // safety net to prevent accidental infinite loops
        if (++pageNum > 500) {
            console.warn("[cat] pagination safety break after 500 pages");
            break;
        }
    }
    console.log(`[cat] fetched total ${out.length} machines`);
    //console.log(out);

    return out;
}