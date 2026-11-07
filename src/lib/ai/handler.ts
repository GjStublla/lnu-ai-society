import "server-only";
import type { ApiErrorResponse, CoachResponse } from "../../types/contracts.ts";
import { buildCoachResponse, chooseFallbackTopic } from "./catalog.ts";
import { getCoachResponse, type CoachDependencies } from "./coach.ts";
import { coachRequestSchema } from "./schema.ts";
import { readBoundedJson, withDeadline } from "./transport.ts";

const MAX_REQUEST_BYTES = 8192;
const headers = { "Cache-Control": "no-store" };
const invalidBody = () => Response.json({
  error: "Send a valid JSON coach request no larger than 8 KB.",
} satisfies ApiErrorResponse, { status: 400, headers });

export async function handleCoachRequest(request: Request, dependencies: CoachDependencies = {}): Promise<Response> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return invalidBody();
  let body: unknown;
  try {
    body = await withDeadline(1500, (signal) => readBoundedJson(request, MAX_REQUEST_BYTES, signal), request.signal);
  } catch {
    return invalidBody();
  }
  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({
    error: "Invalid coach request. Check the profile, message (1–1200 characters) and optional price summary.",
  } satisfies ApiErrorResponse, { status: 400, headers });

  let result: CoachResponse;
  try {
    result = await getCoachResponse(parsed.data, { ...dependencies, signal: request.signal });
  } catch {
    result = buildCoachResponse(parsed.data, chooseFallbackTopic(parsed.data));
  }
  return Response.json(result, { headers });
}
