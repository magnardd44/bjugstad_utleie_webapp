// components/MachinesProvider.server.tsx
// (Server Component)
import { getMachinesFC } from "@/lib/machines";
import { MachinesProvider } from "./MachinesContext";

export const revalidate = 300; // e.g. 5 min ISR for the data bundle

export default async function MachinesProviderServer({
    children,
}: { children: React.ReactNode }) {
    const machines = await getMachinesFC(); // fetched on login/refresh (layout render)
    return <MachinesProvider value={machines}>{children}</MachinesProvider>;
}
