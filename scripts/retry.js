export function getRateLimitDelayMs(error, attempt) {
  const message = error?.data?.error_message || error?.message || "";
  const rateLimited = error?.data?.error === "tooBusy" || /rate limit|units quota/i.test(message);
  if (!rateLimited) return null;

  const retryMatch = message.match(/retry in\s+~?(\d+)\s*ms/i);
  const suggestedDelay = retryMatch ? Number(retryMatch[1]) : 3000 * 2 ** attempt;
  return Math.min(Math.max(suggestedDelay + 500, 1000), 30000);
}

async function reconnect(client) {
  // XRPL clients can have a closing/closed socket object that still blocks connect().
  // disconnect() clears the old connection state before a fresh websocket is opened.
  await client.disconnect();
  await client.connect();
}

export async function requestWithRateLimitRetry(
  client,
  request,
  { maxRetries = 5, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {},
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.request(request);
    } catch (error) {
      const delayMs = getRateLimitDelayMs(error, attempt);
      if (delayMs === null || attempt >= maxRetries) throw error;

      console.warn(`XRPL rate limit reached; reconnecting and retrying in ${Math.ceil(delayMs / 1000)}s.`);
      await sleep(delayMs);
      await reconnect(client);
    }
  }
}
