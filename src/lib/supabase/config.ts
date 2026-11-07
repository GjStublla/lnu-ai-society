export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || !isPublicKey(key)) return null;

  try {
    const parsed = new URL(url);
    const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    return { url, key };
  } catch {
    return null;
  }
}

function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const segments = key.split(".");
  if (segments.length !== 3) return false;
  try {
    const payload = atob(segments[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload)?.role === "anon";
  } catch {
    return false;
  }
}