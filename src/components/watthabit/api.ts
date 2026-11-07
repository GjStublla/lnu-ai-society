// Typed fetch clients for the WattHabit contract (docs/CONTRACT.md).
// Every call has an 8 s deadline, checks response.ok, and throws on failure so
// callers can fall back to the typed demo fixtures in src/lib/mock.
import type {
  CoachRequest,
  CoachResponse,
  CompleteChallengeRequest,
  CompleteChallengeResponse,
  OpportunitiesResponse,
  PricesResponse,
  RedeemRequest,
  RedeemResponse,
  Region,
  RewardsResponse,
} from "@/types/contracts";

const TIMEOUT_MS = 8_000;
// docs/AI_INTEGRATION.md: the coach route may use ~8 s internally; allow ~10 s end to end.
const COACH_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson<T>(url: string, init: RequestInit | undefined, isValid: (body: unknown) => boolean, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body: unknown = await response.json();
        if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
          message = (body as { error: string }).error.slice(0, 200);
        }
      } catch {
        /* Non-JSON error body. */
      }
      throw new ApiError(message, response.status);
    }
    const body: unknown = await response.json();
    if (!isValid(body)) throw new ApiError("Unexpected response shape", response.status);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? "Request timed out" : "Network error", null);
  } finally {
    clearTimeout(timer);
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function getPrices(region: Region, date: string): Promise<PricesResponse> {
  const query = new URLSearchParams({ region, date });
  return requestJson<PricesResponse>(`/api/prices?${query}`, undefined, (b) => isObject(b) && Array.isArray(b.intervals) && typeof b.status === "string");
}

export function getOpportunities(region: Region): Promise<OpportunitiesResponse> {
  return requestJson<OpportunitiesResponse>(`/api/opportunities?region=${region}`, undefined, (b) => isObject(b) && Array.isArray(b.opportunities));
}

export function postCoach(body: CoachRequest): Promise<CoachResponse> {
  return requestJson<CoachResponse>(
    "/api/coach",
    { method: "POST", body: JSON.stringify(body) },
    (b) => isObject(b) && typeof b.reply === "string" && (b.source === "groq" || b.source === "fallback"),
    COACH_TIMEOUT_MS,
  );
}

export function postCompleteChallenge(body: CompleteChallengeRequest): Promise<CompleteChallengeResponse> {
  return requestJson<CompleteChallengeResponse>(
    "/api/challenges/complete",
    { method: "POST", body: JSON.stringify(body) },
    (b) => isObject(b) && typeof b.progress === "number" && typeof b.goal === "number",
  );
}

export function getRewards(): Promise<RewardsResponse> {
  return requestJson<RewardsResponse>("/api/rewards", undefined, (b) => isObject(b) && Array.isArray(b.vouchers) && typeof b.progress === "number");
}

export function postRedeem(body: RedeemRequest): Promise<RedeemResponse> {
  return requestJson<RedeemResponse>("/api/rewards/redeem", { method: "POST", body: JSON.stringify(body) }, (b) => isObject(b) && typeof b.status === "string");
}
