import "server-only";

import { z } from "zod";
import type { ApiErrorResponse, CompleteChallengeResponse, RedeemResponse, RewardsResponse } from "@/types/contracts";
import { getAuthenticatedSupabase } from "./server";

type RewardRpcs = {
  watthabit_rewards: { args: undefined; result: RewardsResponse };
  watthabit_complete_challenge: { args: { p_challenge_id: string }; result: CompleteChallengeResponse };
  watthabit_redeem: { args: { p_voucher_id: string; p_code: string }; result: RedeemResponse };
};

const stampCount = z.number().int().nonnegative();
const rpcSchemas = {
  watthabit_rewards: z.strictObject({
    points: stampCount,
    progress: stampCount,
    goal: stampCount,
    vouchers: z.array(z.strictObject({
      id: z.string(),
      title: z.string(),
      code: z.string(),
      isRedeemed: z.boolean(),
      demo: z.literal(true),
    })),
  }),
  watthabit_complete_challenge: z.strictObject({
    progress: stampCount,
    goal: stampCount,
    rewardUnlocked: z.boolean(),
    demo: z.literal(true),
  }),
  watthabit_redeem: z.strictObject({
    status: z.enum(["redeemed", "already_redeemed", "invalid"]),
    demo: z.literal(true),
  }),
} satisfies { [Name in keyof RewardRpcs]: z.ZodType<RewardRpcs[Name]["result"]> };

export function rewardJson<T>(body: T, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function rewardError(error: string, status = 400) {
  return rewardJson<ApiErrorResponse>({ error }, status);
}

export function rewardMethodNotAllowed(allow: string) {
  const response = rewardError("Method not allowed.", 405);
  response.headers.set("Allow", allow);
  return response;
}

export async function rewardResponse<Name extends keyof RewardRpcs>(
  name: Name,
  args: RewardRpcs[Name]["args"],
  demo: () => Promise<RewardRpcs[Name]["result"]>,
) {
  try {
    const client = await getAuthenticatedSupabase();
    if (!client) return rewardJson(await demo());

    const { data, error } = await client.rpc(name, args);
    if (error) throw error;
    return rewardJson(rpcSchemas[name].parse(data));
  } catch {
    return rewardError("Rewards are temporarily unavailable. Please try again.", 503);
  }
}

export async function readRewardBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json" || !request.body) return null;

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const maxBytes = 2_048;
  let body = "";
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}