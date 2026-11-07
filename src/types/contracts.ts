// Canonical shared API types — only Gjin may change without team agreement.
export type Region = 'SE1' | 'SE2' | 'SE3' | 'SE4';
export type DataStatus = 'live' | 'cached' | 'demo' | 'unavailable';
export type PriceInterval = { startsAt: string; endsAt: string; sekPerKwh: number };
export type PricesResponse = {
  region: Region;
  date: string;
  currency: 'SEK';
  unit: 'SEK/kWh';
  intervals: PriceInterval[];
  sourceUrl: string;
  status: DataStatus;
  updatedAt: string;
  error?: string;
};
export type Opportunity = {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  publishedAt: string;
  expiresAt: string | null;
  eligibility: string;
  category: 'energy' | 'student' | 'partner';
  verified: boolean;
  demo: boolean;
};
export type OpportunitiesResponse = { opportunities: Opportunity[]; updatedAt: string };
export type Housing = 'included' | 'separate' | 'unknown';
export type CoachRequest = {
  region: Region;
  housing: Housing;
  activities: string[];
  availableAfter: string | null;
  priceSummary: {
    cheapestWindowStart: string | null;
    cheapestWindowEnd: string | null;
    relativePriceDescription: string | null;
  } | null;
  message: string;
};
export type EstimatedImpact = {
  kwh: number | null;
  sek: number | null;
  kgCo2e: number | null;
  assumption: string;
};
export type Quest = {
  id: string;
  title: string;
  description: string;
  evidenceSource: string | null;
  estimatedImpact: EstimatedImpact | null;
};
export type CoachResponse = {
  reply: string;
  quest: Quest | null;
  disclaimer: string | null;
  source: 'groq' | 'fallback';
  model: string | null;
};
export type CompleteChallengeRequest = { challengeId: string };
export type CompleteChallengeResponse = { progress: number; goal: number; rewardUnlocked: boolean; demo: true };
export type Reward = { id: string; title: string; code: string; isRedeemed: boolean; demo: true };
export type RewardsResponse = { points: number; progress: number; goal: number; vouchers: Reward[] };
export type RedeemResponse = { status: 'redeemed' | 'already_redeemed' | 'invalid'; demo: true };
export type RedeemRequest = { voucherId: string; code: string };
// Non-2xx validation failures only; successful endpoint responses retain their shapes above.
export type ApiErrorResponse = { error: string };
