import { z } from "zod";
import { demoVoucher, redeemDemoVoucher } from "@/lib/supabase/demo-rewards";
import { readRewardBody, rewardError, rewardJson, rewardMethodNotAllowed, rewardResponse } from "@/lib/supabase/reward-api";
import type { RedeemRequest, RedeemResponse } from "@/types/contracts";

const bodySchema = z.strictObject({
  voucherId: z.string().min(1).max(64),
  code: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readRewardBody(request));
  if (!parsed.success) return rewardError("Provide a voucherId and code.");
  const { voucherId, code }: RedeemRequest = parsed.data;
  if (voucherId !== demoVoucher.id || code !== demoVoucher.code) {
    return rewardJson<RedeemResponse>({ status: "invalid", demo: true });
  }

  return rewardResponse(
    "watthabit_redeem",
    { p_voucher_id: voucherId, p_code: code },
    redeemDemoVoucher,
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
