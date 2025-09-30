// azure/function/src/services/cat.ts
import axios, {
    AxiosInstance,
    AxiosHeaders,
    InternalAxiosRequestConfig,
    isAxiosError,
} from "axios";
import { requireConfig } from "../shared/kv";

/**
 * Token response shape (standard OAuth2).
 */
type TokenResp = { access_token: string; token_type?: string; expires_in?: number };

let tokenCache: { token?: string; exp?: number } = {};
let http: AxiosInstance | null = null;

async function getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (tokenCache.token && tokenCache.exp && tokenCache.exp - 60 > now) return tokenCache.token!;

    const tokenUrl = await requireConfig("CAT_TOKEN_URL");
    const clientId = await requireConfig("CAT_CLIENT_ID");
    const clientSecret = await requireConfig("CAT_CLIENT_SECRET");
    const scope = await requireConfig("CAT_SCOPE");

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        // Some CAT tenants may require scope/audience; if so add a secret:
        scope// e.g. "api://.../.default"
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
        cfg.headers = headers;
        console.log(`[cat] -> ${cfg.method?.toUpperCase()} ${baseURL}${cfg.url}`);
        return cfg;
    });

    return http;
}

/**
 * Minimal AEMP-ish asset + optional embedded geo.
 * Different OEMs vary; we keep this permissive.
 */
export type CatMachine = {
    id: string;
    name?: string | null;
    oemName?: string | null;
    geo?: {
        time?: number;        // ms since epoch
        longitude?: number;
        latitude?: number;
    };
};

// Common AEMP container variants we’ve seen across OEMs
type Envelope<T> =
    | T[]
    | { data?: T[]; items?: T[]; value?: T[]; next?: string; links?: { next?: string }; page?: { next?: string } };

function extractItems<T>(data: Envelope<T>): T[] {
    if (Array.isArray(data)) return data;
    if ((data as any)?.data && Array.isArray((data as any).data)) return (data as any).data;
    if ((data as any)?.items && Array.isArray((data as any).items)) return (data as any).items;
    if ((data as any)?.value && Array.isArray((data as any).value)) return (data as any).value;
    return [];
}

function extractNext(data: any, headers: Record<string, any>): string | null {
    const hlink: string | undefined = headers?.link || headers?.Link;
    const headerNext = hlink?.match(/<([^>]+)>\s*;\s*rel="?next"?/i)?.[1];
    const bodyNext =
        data?.next ||
        data?.links?.next ||
        data?.page?.next ||
        data?.pagination?.next;
    return typeof headerNext === "string" ? headerNext : (typeof bodyNext === "string" ? bodyNext : null);
}

/**
 * Best-effort mapper from a raw CAT AEMP Asset JSON to our CatMachine DTO.
 * We deliberately probe several likely field names without assuming a single schema.
 */
function mapAssetToMachine(raw: any): CatMachine | null {
    if (!raw) return null;

    // Identify a stable id (prefer AEMP asset identifiers)
    const id =
        raw.assetId ||
        raw.id ||
        raw.uid ||
        raw.machineId ||
        raw.serialNumber || // last resort, but often unique
        raw.deviceId;

    if (!id) return null;

    const name =
        raw.assetName ||
        raw.name ||
        raw.displayName ||
        raw.description ||
        null;

    // Try to find embedded position if present on the asset payload
    // Common AEMP patterns: lastLocation, lastKnownLocation, location, position
    const loc =
        raw.lastLocation ||
        raw.lastKnownLocation ||
        raw.location ||
        raw.position ||
        (raw.geo && typeof raw.geo === "object" ? raw.geo : undefined);

    let geo: CatMachine["geo"] | undefined = undefined;
    if (loc) {
        const ts =
            loc.timestamp ||
            loc.time ||
            loc.reportedAt ||
            loc.measurementTime ||
            raw.lastLocationTimestamp;

        const lat = loc.latitude ?? loc.lat ?? loc.y;
        const lon = loc.longitude ?? loc.lon ?? loc.x;

        if (lat != null && lon != null) {
            const ms = typeof ts === "number"
                ? (ts > 10_000_000_000 ? ts : ts * 1000) // seconds vs ms
                : (ts ? Date.parse(ts) : undefined);
            geo = {
                time: ms && !Number.isNaN(ms) ? ms : undefined,
                latitude: Number(lat),
                longitude: Number(lon),
            };
        }
    }

    return {
        id: String(id),
        name: name ?? null,
        oemName: "CAT",
        geo,
    };
}

/**
 * Fetch all assets from CAT AEMP, optionally including last position when provided inline.
 * If inline location is not present, we still return assets; later we can augment with a
 * `/locations` call keyed by asset ids (left as an optimization if needed).
 */
export async function fetchAllCatMachines(): Promise<CatMachine[]> {
    const client = await getHttp();
    const assetsPath = (await requireConfig("CAT_AEMP_ASSETS_PATH").catch(() => "/assets")) || "/assets";
    const pageSize = Number(process.env.CAT_PAGE_SIZE || "200");

    let url: string | null = assetsPath.startsWith("/") ? assetsPath : `/${assetsPath}`;
    const out: CatMachine[] = [];
    let page = 0;

    while (url) {
        page += 1;
        try {
            const resp = await client.get<Envelope<any>>(url, {
                params: {
                    // Not all providers honor these; harmless if ignored
                    pageSize,
                    // Some AEMP variants support changedSince / updatedAfter etc.
                    // changedSince: new Date(Date.now() - 24*3600*1000).toISOString(),
                    // include: "location", // Only if CAT supports it; safe to omit by default
                },
                validateStatus: () => true,
            });

            console.log(`[cat] <- ${resp.status} for ${client.defaults.baseURL}${url}`);
            if (resp.status >= 400) {
                const bodyTxt = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
                throw new Error(`GET ${url} failed ${resp.status}: ${bodyTxt}`);
            }

            const items = extractItems<any>(resp.data);
            for (const raw of items) {
                const m = mapAssetToMachine(raw);
                if (m) out.push(m);
            }

            const next = extractNext(resp.data, resp.headers as any);
            url = typeof next === "string" ? next : null;
            if (page > 100) break; // safety
        } catch (e: any) {
            if (isAxiosError(e)) {
                const data = e.response?.data;
                console.error(
                    `[cat] axios error: status=${e.response?.status} msg=${e.message} body=${typeof data === "string" ? data : JSON.stringify(data)
                    }`
                );
            }
            throw e;
        }
    }

    return out;
}
