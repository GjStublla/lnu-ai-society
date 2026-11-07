import { z } from "zod";
import { challengeIds, completeDemoChallenge } from "@/lib/supabase/demo-rewards";
import { readRewardBody, rewardError, rewardMethodNotAllowed, rewardResponse } from "@/lib/supabase/reward-api";

const bodySchema = z.strictObject({ challengeId: z.enum(challengeIds) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readRewardBody(request));
  if (!parsed.success) return rewardError("Provide a supported challengeId.");
  const { challengeId } = parsed.data;

  return rewardResponse(
    "watthabit_complete_challenge",
    { p_challenge_id: challengeId },
    () => completeDemoChallenge(challengeId),
  );
}

const allowedMethods = "POST, OPTIONS";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: allowedMethods } });
}

function methodNotAllowed() {
  return rewardMethodNotAllowed(allowedMethods);
}

export { methodNotAllowed as GET, methodNotAllowed as HEAD, methodNotAllowed as PUT, methodNotAllowed as PATCH, methodNotAllowed as DELETE };
