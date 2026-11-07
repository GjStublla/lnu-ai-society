import type { Opportunity } from "@/types/contracts";

/**
 * Curated, verified public notices for the Savings Radar.
 *
 * Rules for this file:
 * - Every entry needs a live public HTTPS URL that supports the title, date
 *   and eligibility. No cafe partnerships, vouchers or exclusive discounts are
 *   invented here.
 * - `publishedAt` is an evidenced date taken from the source page. Where a
 *   page exposes only a "last updated" date, the description says so.
 * - Empty verified feeds are allowed. Do not add a demo entry to fill space;
 *   the UI shows a demo card separately if it wants one.
 */

export const VERIFIED_OPPORTUNITIES: readonly Opportunity[] = [
  {
    id: "elpriskollen-kvartsprisavtal",
    title: "How a quarter-hour price contract works",
    description:
      "Elpriskollen (the Swedish Energy Markets Inspectorate) explains quarter-hour priced contracts: you pay the spot price for each 15-minute period plus the supplier's markup and VAT. The page suggests planning energy-heavy use for cheaper periods and notes that power fees also affect the total.",
    sourceUrl: "https://elpriskollen.se/sidor/sank-dina-kostnader-med-kvartsprisavtal.html",
    publishedAt: "2025-09-16T15:47:00+02:00",
    expiresAt: null,
    eligibility:
      "Households with, or considering, a variable quarter-hour price contract. A fixed-price contract does not benefit from shifting usage.",
    category: "energy",
    verified: true,
    demo: false,
  },
  {
    id: "elpriskollen-styr-din-elanvandning",
    title: "Steer electricity use around price and power fees",
    description:
      "Elpriskollen's guide to smart, partly automated control of electricity use. Its savings example for a household with a heat pump and an electric car is based on a 2025 RISE simulation study: a modelled estimate, not a guaranteed saving.",
    sourceUrl: "https://elpriskollen.se/sidor/styr-din-elanvandning.html",
    publishedAt: "2026-03-23T15:26:12+01:00",
    expiresAt: null,
    eligibility:
      "Open to all households. The largest potential is for homes with electric heating, a heat pump or home EV charging.",
    category: "energy",
    verified: true,
    demo: false,
  },
  {
    id: "energimyndigheten-energi-klimatradgivning",
    title: "Free municipal energy and climate advice",
    description:
      "Energimyndigheten describes the municipal energy and climate advice service: free, impartial help with heating, energy efficiency, transport and energy costs. The source page states it was last updated on 2026-03-23.",
    sourceUrl:
      "https://www.energimyndigheten.se/effektiv-energianvandning/hushall/energi--och-klimatradgivning/",
    // The page exposes only "Senast uppdaterad 2026-03-23"; no earlier
    // publication date is shown, so the evidenced update date is used.
    publishedAt: "2026-03-23T00:00:00+01:00",
    expiresAt: null,
    eligibility:
      "Households in Sweden. The advice is free and impartial; you decide which measures to take.",
    category: "energy",
    verified: true,
    demo: false,
  },
];

function isExpired(opportunity: Opportunity, nowMs: number): boolean {
  return opportunity.expiresAt !== null && Date.parse(opportunity.expiresAt) <= nowMs;
}

/** Verified notices that have not expired, newest first. */
export function getCurrentOpportunities(now: Date = new Date()): Opportunity[] {
  const nowMs = now.getTime();
  return VERIFIED_OPPORTUNITIES.filter((opportunity) => !isExpired(opportunity, nowMs))
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** Structural checks used by the feature tests; returns human-readable problems. */
export function validateOpportunityCatalog(): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();

  for (const opportunity of VERIFIED_OPPORTUNITIES) {
    if (seenIds.has(opportunity.id)) problems.push(`duplicate id: ${opportunity.id}`);
    seenIds.add(opportunity.id);

    if (!opportunity.sourceUrl.startsWith("https://")) {
      problems.push(`sourceUrl must be HTTPS: ${opportunity.id}`);
    }
    if (!Number.isFinite(Date.parse(opportunity.publishedAt))) {
      problems.push(`publishedAt is not a valid ISO instant: ${opportunity.id}`);
    }
    if (opportunity.expiresAt !== null && !Number.isFinite(Date.parse(opportunity.expiresAt))) {
      problems.push(`expiresAt is not a valid ISO instant: ${opportunity.id}`);
    }
    if (!opportunity.verified || opportunity.demo) {
      problems.push(`catalog must contain only verified, non-demo notices: ${opportunity.id}`);
    }
  }

  return problems;
}
