// Frontend-only UI types (not API shapes — those live in src/types/contracts.ts).
export type Activity = "laundry" | "dishwasher" | "charging";

export const ACTIVITIES: Activity[] = ["laundry", "dishwasher", "charging"];
