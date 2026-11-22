// scripts/build.js
import { Client } from "xrpl";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { writeCmcEndpoints } from "./cmc-endpoints.js";
import { requestWithRateLimitRetry } from "./retry.js";

// ---- $DROP settings ----
const ISSUER   = "rszenFJoDdiGjyezQc8pME9KWDQH43Tswh"; // DROP issuer
const DECIMALS = 6;
const MAX_SUPPLY_STR = "1000000.000000";                // fixed cap
const WSS = "wss://xrplcluster.com";

// If, later, you want to exclude team/treasury/blackhole wallets from circulating:
const EXCLUDED = []; // e.g., ["rXXXXXXXX...", "rYYYYYYYY..."]

// XRPL currency helper: DROP is 160-bit hex "DROP"
const DROP_HEX = "44524F5000000000000000000000000000000000";
function isDROP(code) {
  const u = (code || "").toUpperCase();
  return u === "DROP" || u === DROP_HEX;
}

function toFixedStr(n) {
  return Number(n).toFixed(DECIMALS);
}

async function getIssuedAndExcluded() {
  const client = new Client(WSS);
  await client.connect();
  try {
    // ---- Sum total issued by walking issuer trustlines ----
    let issued = 0;
    let marker;
    do {
      const req = {
        command: "account_lines",
        account: ISSUER,
        ledger_index: "validated",
        limit: 400
      };
      if (marker) req.marker = marker; // only include when present

      const resp = await requestWithRateLimitRetry(client, req);
      for (const line of resp.result.lines || []) {
        if (!isDROP(line.currency)) continue;
        // From issuer perspective, NEGATIVE means tokens issued/outstanding
        const bal = Number(line.balance);
        if (bal < 0) issued += -bal;
      }
      marker = resp.result.marker;
    } while (marker);

    // ---- Sum balances held by excluded accounts (optional) ----
    let excludedHeld = 0;
    for (const acct of EXCLUDED) {
      let m;
      do {
        const req2 = {
          command: "account_lines",
          account: acct,
          ledger_index: "validated",
          limit: 400
        };
        if (m) req2.marker = m;

        const resp2 = await requestWithRateLimitRetry(client, req2);
        for (const line of resp2.result.lines || []) {
          if (line.account !== ISSUER) continue;     // counterparty must be issuer
          if (!isDROP(line.currency)) continue;
          // From holder perspective, POSITIVE means they hold DROP
          const held = Number(line.balance);
          if (held > 0) excludedHeld += held;
        }
        m = resp2.result.marker;
      } while (m);
    }

    return {
      issued: toFixedStr(issued),
      excludedHeld: toFixedStr(excludedHeld)
    };
  } finally {
    await client.disconnect().catch(() => {});
  }
}

async function main() {
  const { issued, excludedHeld } = await getIssuedAndExcluded();
  const circulating = toFixedStr(Number(issued) - Number(excludedHeld));

  const payload = {
    symbol: "DROP",
    decimals: DECIMALS,
    total_supply: issued,
    circulating_supply: circulating,
    max_supply: MAX_SUPPLY_STR,
    issued_supply: issued,
    excluded_accounts: EXCLUDED,
    issuer: ISSUER,
    updated_at: new Date().toISOString(),
    info: {
      xrpscan: `https://xrpscan.com/account/${ISSUER}`
    }
  };

  // Keep the generated files in docs/ in the private source repo; the workflow publishes them to Vercel.
  if (!existsSync("docs")) mkdirSync("docs");
  const outPath = "docs/supply.json";

  // Only write/commit if changed
  let changed = true;
  if (existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, "utf8"));
      changed = JSON.stringify(prev) !== JSON.stringify(payload);
    } catch {}
  }

  if (changed) {
    writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log("Updated docs/supply.json");
  } else {
    console.log("No change in docs/supply.json");
  }

  // CMC expects a plain decimal number in the response body, not a JSON object.
  // Their total supply corresponds to issued/outstanding tokens; the fixed cap is max supply.
  for (const path of writeCmcEndpoints(payload)) console.log(`Updated ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
