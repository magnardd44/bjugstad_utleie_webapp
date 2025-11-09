// lib/oemLogos.ts
const DEFAULT_LOGO = "/oem-logos/default.svg";

const OEM_LOGOS: Record<string, string> = {
    cat: "/oem-logos/cat.svg",
    hydrema: "/oem-logos/hydrema.svg",
    // add more as you drop files in public/oem-logos
};

function slugifyOem(input: string | null | undefined) {
    return input?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ?? "";
}

export function getOemLogo(oemName?: string | null) {
    const slug = slugifyOem(oemName);
    if (!slug) return DEFAULT_LOGO;
    return OEM_LOGOS[slug] ?? DEFAULT_LOGO;
}
