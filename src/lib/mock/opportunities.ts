import type { OpportunitiesResponse } from "@/types/contracts";

/** Demo-only opportunity. Not a real offer, partnership or verified promotion. */
export function buildDemoOpportunities(updatedAt: string): OpportunitiesResponse {
  return {
    updatedAt,
    opportunities: [
      {
        id: "demo-campus-cafe-example",
        title: "Example: campus café stamp perk",
        description:
          "Illustration of how a future local partner perk could appear here. No café, discount or partnership exists.",
        sourceUrl: "https://www.elprisetjustnu.se/elpris-api",
        publishedAt: "2026-11-01T00:00:00+01:00",
        expiresAt: null,
        eligibility: "Demo only — nobody is eligible. Not redeemable.",
        category: "partner",
        verified: false,
        demo: true,
      },
    ],
  };
}
