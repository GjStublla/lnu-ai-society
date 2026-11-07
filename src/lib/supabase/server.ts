import "server-only";

import { createServerClient } from "@supabase/ssr";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

const invalidSessionCodes = new Set([
  "bad_jwt",
  "invalid_jwt",
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
]);

export async function getAuthenticatedSupabase() {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  const deadline = AbortSignal.timeout(8_000);
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates) => {
        for (const { name, value, options } of updates) {
          cookieStore.set(name, value, options);
        }
      },
    },
    global: {
      fetch: (input, init) => {
        const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
        return fetch(input, { ...init, signal: signal ? AbortSignal.any([signal, deadline]) : deadline });
      },
    },
  });

  const { data, error } = await client.auth.getClaims();
  if (error) {
    if (invalidSessionCodes.has(error.code ?? "") || isAuthSessionMissingError(error)) return null;
    throw error;
  }
  return data?.claims.sub ? client : null;
}