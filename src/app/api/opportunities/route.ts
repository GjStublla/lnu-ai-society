import { OPPORTUNITIES_UPDATED_AT, getCurrentOpportunities } from "@/lib/energy/opportunities";
import { DEFAULT_REGION, REGION_ERROR_MESSAGE, parseRegion } from "@/lib/energy/regions";
import type { OpportunitiesResponse } from "@/types/contracts";

// Curated server data; keep it dynamic so the response timestamp is real.
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

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;

/**
 * GET /api/opportunities?region=SE4
 *
 * Returns only sourced, verified public notices. An empty list is a valid
 * result and should be shown as "no verified offers right now" rather than
 * filled with an invented deal. Expired notices are filtered out.
 */
export async function GET(request: Request): Promise<Response> {
  const rawRegion = new URL(request.url).searchParams.get("region");
  const region = rawRegion === null ? DEFAULT_REGION : parseRegion(rawRegion);
  if (!region) return json({ error: REGION_ERROR_MESSAGE }, 400);

  const response: OpportunitiesResponse = {
    opportunities: getCurrentOpportunities(new Date()),
    // The feed is curated in-repo; request time would falsely imply it was
    // refreshed on every call.
    updatedAt: OPPORTUNITIES_UPDATED_AT,
  };
  return json(response);
}
