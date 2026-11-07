import type { OpportunitiesResponse } from "@/types/contracts";

/** No fixture is safe to present as a sourced opportunity; keep the empty state honest. */
export function buildDemoOpportunities(updatedAt: string): OpportunitiesResponse {
  return { updatedAt, opportunities: [] };
}
