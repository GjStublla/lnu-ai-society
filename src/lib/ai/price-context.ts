import "server-only";
import type { CoachRequest } from "../../types/contracts.ts";
import { loadPrices } from "../energy/service";
import { addCalendarDays, stockholmDateString } from "../energy/time";
import { chooseVerifiedContext, contextFromPrices, type VerifiedPriceContext } from "./context.ts";

export async function loadVerifiedPriceContext(input: CoachRequest): Promise<VerifiedPriceContext | null> {
  const now = new Date();
  const today = stockholmDateString(now);
  const dates = [today, addCalendarDays(today, 1)].filter((date): date is string => date !== null);
  const results = await Promise.allSettled(dates.map((date) => loadPrices(input.region, date, now)));
  return chooseVerifiedContext(results.map((result) => result.status === "fulfilled" ? contextFromPrices(input, result.value, now) : null));
}
