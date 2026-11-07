import "server-only";

export async function withDeadline<T>(milliseconds: number, action: (signal: AbortSignal) => Promise<T>, parentSignal?: AbortSignal): Promise<T> {
  if (milliseconds <= 0) throw new Error("Request deadline exceeded.");
  if (parentSignal?.aborted) throw new Error("Request cancelled.");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onParentAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onParentAbort = () => {
      controller.abort();
      reject(new Error("Request cancelled."));
    };
    parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  });
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Request deadline exceeded."));
    }, milliseconds);
  });
  try {
    // Race as well as abort: even a transport that ignores AbortSignal cannot block the caller.
    const result = await Promise.race([action(controller.signal), deadline, cancelled]);
    if (parentSignal?.aborted) throw new Error("Request cancelled.");
    return result;
  } finally {
    clearTimeout(timer);
    if (onParentAbort) parentSignal?.removeEventListener("abort", onParentAbort);
    controller.abort();
  }
}

export async function readBoundedJson(
  message: Pick<Request, "body" | "headers">,
  maxBytes: number,
  signal: AbortSignal,
): Promise<unknown> {
  const length = message.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    void message.body?.cancel().catch(() => {});
    throw new Error("Body too large or invalid length.");
  }
  if (!message.body || signal.aborted) throw new Error("Missing or cancelled body.");
  const reader = message.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (signal.aborted) throw new Error("Body read cancelled.");
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Body too large.");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}
