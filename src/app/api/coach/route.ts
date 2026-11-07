import { handleCoachRequest } from "@/lib/ai/handler";
import { loadVerifiedPriceContext } from "@/lib/ai/price-context";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleCoachRequest(request, { loadPriceContext: loadVerifiedPriceContext });
}
