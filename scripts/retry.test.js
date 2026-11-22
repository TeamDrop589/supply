import test from "node:test";
import assert from "node:assert/strict";
import { getRateLimitDelayMs, requestWithRateLimitRetry } from "./retry.js";

test("a rate-limit retry reconnects a closed websocket before requesting again", async () => {
  let connected = true;
  let calls = 0;
  const events = [];
  const client = {
    isConnected: () => connected,
    disconnect: async () => { events.push("disconnect"); connected = false; },
    connect: async () => { events.push("connect"); connected = true; },
    request: async () => {
      calls += 1;
      events.push(`request-${calls}`);
      if (calls === 1) {
        connected = false;
        throw new Error("rate limit; websocket closed");
      }
      return { result: "ok" };
    },
  };

  const result = await requestWithRateLimitRetry(client, {}, { sleep: async (ms) => events.push(`sleep-${ms}`) });
  assert.deepEqual(result, { result: "ok" });
  assert.deepEqual(events, ["request-1", "sleep-3500", "disconnect", "connect", "request-2"]);
});

test("rate-limit retries are bounded", async () => {
  let calls = 0;
  const client = {
    isConnected: () => false,
    disconnect: async () => {},
    connect: async () => {},
    request: async () => { calls += 1; throw new Error("rate limit"); },
  };
  await assert.rejects(
    requestWithRateLimitRetry(client, {}, { maxRetries: 2, sleep: async () => {} }),
    /rate limit/,
  );
  assert.equal(calls, 3);
});

test("rate-limit backoff honors hints and remains capped", () => {
  assert.equal(getRateLimitDelayMs({ message: "rate limit; retry in ~800ms" }, 0), 1300);
  assert.equal(getRateLimitDelayMs({ data: { error: "tooBusy" } }, 8), 30000);
  assert.equal(getRateLimitDelayMs(new Error("bad request"), 0), null);
});
