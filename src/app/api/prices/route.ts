import { createDemoPrices } from "@/lib/energy/demo";
import { pricesResponse, priceSourceUrl } from "@/lib/energy/prices";
import {
  DEFAULT_REGION,
  REGION_ERROR_MESSAGE,
  parseRegion,
  resolvePriceDate,
} from "@/lib/energy/regions";
import { loadPrices } from "@/lib/energy/service";

// Live data: never execute this handler during `next build`.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function methodNotAllowed(): Response {
  return json({ error: "Method not allowed. Use GET." }, 405);
}

// Next would answer 405 with an empty body; the contract asks every route
// response to be JSON, so the unsupported methods are explicit.
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;

const DEMO_FLAG_VALUES = new Set(["1"]);

/**
 * GET /api/prices?region=SE4&date=YYYY-MM-DD
 *
 * Success (including unavailable/cached/demo) is always HTTP 200 with the
 * PricesResponse shape. Invalid region/date/flag is HTTP 400 with
 * ApiErrorResponse. `demo=1` is an explicit offline fixture; it is never used
 * automatically and always returns status:'demo'.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawRegion = url.searchParams.get("region");
  const rawDate = url.searchParams.get("date");
  const rawDemo = url.searchParams.get("demo");

  const region = rawRegion === null ? DEFAULT_REGION : parseRegion(rawRegion);
  if (!region) return json({ error: REGION_ERROR_MESSAGE }, 400);

  const now = new Date();
  const resolvedDate = resolvePriceDate(rawDate, now);
  if (!resolvedDate.ok) return json({ error: resolvedDate.error }, 400);

  if (rawDemo !== null && !DEMO_FLAG_VALUES.has(rawDemo.trim())) {
    return json({ error: "demo must be 1 when provided." }, 400);
  }

  if (rawDemo !== null) {
    return json(createDemoPrices(region, resolvedDate.date, now));
  }

  try {
    return json(await loadPrices(region, resolvedDate.date, now));
  } catch {
    // The endpoint must never crash the page; surface a bounded unavailable
    // response with the agreed shape instead of a 500.
    return json(
      pricesResponse({
        region,
        date: resolvedDate.date,
        intervals: [],
        sourceUrl: priceSourceUrl(region, resolvedDate.date),
        status: "unavailable",
        updatedAt: now.toISOString(),
        error: "The price service is temporarily unavailable. Try again in a moment.",
      }),
    );
  }
}
