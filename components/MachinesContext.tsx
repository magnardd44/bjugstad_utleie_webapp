// components/MachinesContext.tsx
"use client";
import { createContext, useContext } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";

export type MachinesFC = FeatureCollection<Point, { id: string | number; name: string }>;

const MachinesCtx = createContext<MachinesFC | null>(null);

export function useMachines() {
    const v = useContext(MachinesCtx);
    if (!v) throw new Error("Machines context not available");
    return v;
}

export function MachinesProvider({ value, children }: { value: MachinesFC; children: React.ReactNode }) {
    return <MachinesCtx.Provider value={value}>{children}</MachinesCtx.Provider>;
}