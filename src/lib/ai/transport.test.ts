import assert from "node:assert/strict";
import { test } from "node:test";
import { readBoundedJson, withDeadline } from "./transport.ts";

test("bounded reader joins split UTF-8 bytes and parses the actual JSON", async () => {
  const bytes = new TextEncoder().encode('{"word":"café"}');
  const body = new ReadableStream<Uint8Array<ArrayBuffer>>({ start(controller) {
    controller.enqueue(bytes.slice(0, 13)); controller.enqueue(bytes.slice(13)); controller.close();
  } });
  const result = await withDeadline(100, (signal) => readBoundedJson({ body, headers: new Headers() }, 100, signal));
  assert.deepEqual(result, { word: "café" });
});

test("stream byte limit applies without content-length and cancels oversized input", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array<ArrayBuffer>>({ start(controller) { controller.enqueue(new Uint8Array(101)); }, cancel() { cancelled = true; } });
  await assert.rejects(withDeadline(100, (signal) => readBoundedJson({ body, headers: new Headers() }, 100, signal)), /too large/);
  assert.equal(cancelled, true);
});

test("invalid length, invalid UTF-8, missing body and malformed JSON are rejected", async () => {
  const messages = [
    new Response("{}", { headers: { "content-length": "1000" } }),
    new Response("{}", { headers: { "content-length": "bad" } }),
    new Response(new Uint8Array([255])),
    new Response(null), new Response("{"),
  ];
  for (const message of messages) await assert.rejects(withDeadline(100, (signal) => readBoundedJson(message, 100, signal)));
});

test("deadline aborts and cancels a slow body rather than leaving an infinite read", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array<ArrayBuffer>>({ cancel() { cancelled = true; } });
  const start = Date.now();
  await assert.rejects(withDeadline(25, (signal) => readBoundedJson({ body, headers: new Headers() }, 100, signal)));
  assert.equal(cancelled, true);
  assert.ok(Date.now() - start < 1000);
});
