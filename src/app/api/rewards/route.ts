import { getDemoRewards } from "@/lib/supabase/demo-rewards";
import { rewardMethodNotAllowed, rewardResponse } from "@/lib/supabase/reward-api";

export async function GET() {
  return rewardResponse("watthabit_rewards", undefined, getDemoRewards);
}

const allowedMethods = "GET, HEAD, OPTIONS";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: allowedMethods } });
}

function methodNotAllowed() {
  return rewardMethodNotAllowed(allowedMethods);
}

export { methodNotAllowed as POST, methodNotAllowed as PUT, methodNotAllowed as PATCH, methodNotAllowed as DELETE };
