// src/services/hydrema.ts
import axios, {
    AxiosInstance,
    AxiosHeaders,
    InternalAxiosRequestConfig,
    isAxiosError,
} from "axios";
import { requireConfig } from "../shared/kv";

type TokenResp = { access_token: string; token_type: string; expires_in: number };

let tokenCache: { token?: string; exp?: number } = {};
let http: AxiosInstance | null = null;

async function getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (tokenCache.token && tokenCache.exp && tokenCache.exp - 60 > now) return tokenCache.token!;

    const tokenUrl = await requireConfig("HYDREMA_TOKEN_URL");
    const clientId = await requireConfig("HYDREMA_CLIENT_ID");
    const clientSecret = await requireConfig("HYDREMA_CLIENT_SECRET");

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        // If your tenant requires it, you can optionally add scope:
        // scope: await getConfig("HYDREMA_SCOPE")  // e.g. "api://.../.default"
    });

    const resp = await axios.post<TokenResp>(tokenUrl, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
        validateStatus: () => true, // let us log 4xx bodies
    });

    if (resp.status >= 400) {
        const bodyTxt = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
        throw new Error(`TOKEN ${tokenUrl} -> ${resp.status} ${bodyTxt}`);
    }

    const { access_token, expires_in } = resp.data;
    tokenCache = { token: access_token, exp: now + (expires_in || 3600) };
    console.log(`[hydrema] token ok len=${access_token?.length ?? 0}`);
    return access_token;
}

async function getHttp(): Promise<AxiosInstance> {
    if (http) return http;
    const baseURL = await requireConfig("HYDREMA_API_BASEURL");
    http = axios.create({ baseURL, timeout: 20000 });

    http.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
        const headers = AxiosHeaders.from(cfg.headers);
        const token = await getToken();
        headers.set("Authorization", `Bearer ${token}`);
        headers.set("Accept", "application/json");
        cfg.headers = headers;
        // Log the outgoing request (no secrets)
        console.log(`[hydrema] -> ${cfg.method?.toUpperCase()} ${baseURL}${cfg.url}`);
        return cfg;
    });

    return http;
}

export type HydremaMachine = {
    id: string;
    name?: string | null;
    oemName?: string | null;
    geo?: {
        time?: number;        // ms since epoch
        longitude?: number;
        latitude?: number;
    };
};
type MachinesResponse =
    | HydremaMachine[]
    | { data?: HydremaMachine[]; items?: HydremaMachine[]; links?: { next?: string }; next?: string; page?: { next?: string } };

function extractItems(respData: MachinesResponse): HydremaMachine[] {
    if (Array.isArray(respData)) return respData;
    if (respData?.data && Array.isArray(respData.data)) return respData.data;
    if (respData?.items && Array.isArray(respData.items)) return respData.items;
    return [];
}

export async function fetchAllMachines(): Promise<HydremaMachine[]> {
    const client = await getHttp();
    let url: string | null = "/machines";         // ensure leading slash
    const results: HydremaMachine[] = [];
    let page = 0;

    while (url) {
        page += 1;
        try {
            // remove params first while debugging; re-add later if needed
            const resp = await client.get<MachinesResponse>(url, {
                params: { geo: true },             // <-- request last known position
                validateStatus: () => true,
            });

            console.log(`[hydrema] <- ${resp.status} for ${client.defaults.baseURL}${url}`);
            if (resp.status >= 400) {
                const bodyTxt = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
                throw new Error(`GET ${url} failed ${resp.status}: ${bodyTxt}`);
            }

            const batch = extractItems(resp.data);
            results.push(...batch);

            // basic pagination (only if API advertises it)
            const next =
                (resp.headers?.link && resp.headers.link.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1]) ||
                (resp.data as any)?.next ||
                (resp.data as any)?.links?.next ||
                (resp.data as any)?.page?.next;

            url = typeof next === "string" ? next : null;
            if (page > 50) break;
        } catch (e: any) {
            if (isAxiosError(e)) {
                const data = e.response?.data;
                console.error(
                    `[hydrema] axios error: status=${e.response?.status} msg=${e.message} body=${typeof data === "string" ? data : JSON.stringify(data)
                    }`
                );
            }
            throw e; // let the function handler log+continue
        }
    }

    return results;
}
