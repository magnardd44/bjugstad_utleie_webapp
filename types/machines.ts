// types/machines.ts
import type { Feature, FeatureCollection, Point } from "geojson";

export type MachineProps = {
    id: string | number;
    name: string;
    // not optional: the server returns either ISO string or null
    last_pos_reported_at: string | null;
};

export type MachineFeature = Feature<Point, MachineProps>;
export type MachinesFC = FeatureCollection<Point, MachineProps>;
