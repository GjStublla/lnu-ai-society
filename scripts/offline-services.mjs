// Test-only fetch guard. Block only the two public upstreams used by smoke;
// requests to the local production server and every other URL pass through.
const originalFetch = globalThis.fetch;
globalThis.fetch = async function guardedFetch(input, init) {
  const raw = typeof input === "string" || input instanceof URL ? input : input.url;
  const host = new URL(raw).hostname;
  if (host === "api.groq.com" || host === "www.elprisetjustnu.se") {
    return new Response("Offline smoke test", { status: 503, headers: { "content-type": "text/plain" } });
  }
  return originalFetch.call(this, input, init);
};
