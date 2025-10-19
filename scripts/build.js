import { Client } from "xrpl";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";

const ISSUER = "rszenFJoDdiGjyezQc8pME9KWDQH43Tswh"; // DROP issuer
const CURRENCY = "DROP"; // use 40-char hex if you used a 160-bit code
const DECIMALS = 6;
const WSS = "wss://xrplcluster.com";

// If you later want to exclude team/treasury/blackhole wallets, add them here:
const EXCLUDED = []; // e.g., ["rXXXXXXXX...", "rYYYYYYYY..."]

function toFixedStr(n) {
  return Number(n).toFixed(DECIMALS);
}

async function getIssuedAndExcluded() {
  const client = new Client(WSS);
  await client.connect();

  // ---- Sum total issued by walking issuer trustlines ----
  let issued = 0;
  let marker;

  do {
    const req = {
      command: "account_lines",
      account: ISSUER,
      ledger_index: "validated",
      limit: 400,
    };
    if (marker) req.marker = marker; // only include when present

    const resp = await client.request(req);
    for (const line of resp.result.lines || []) {
      if ((line.currency || "").toUpperCase() !== CURRENCY.toUpperCase()) continue;
      const bal = Number(line.balance); // issuer perspective: NEGATIVE means issued/outstanding
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
        limit: 400,
      };
      if (m) req2.marker = m;

      const resp2 = await client.request(req2);
      for (const line of resp2.result.lines || []) {
        if (line.account !== ISSUER) continue; // counterparty must be issuer
        if ((line.currency || "").toUpperCase() !== CURRENCY.toUpperCase()) continue;
        const held = Number(line.balance); // holder perspective: POSITIVE means they hold DROP
        if (held > 0) excludedHeld += held;
      }
      m = resp2.result.marker;
    } while (m);
  }

  await client.disconnect();

  return {
    issued: toFixedStr(issued),
    excludedHeld: toFixedStr(excludedHeld),
  };
}

async function main() {
  const totalSupply = "1000000.000000"; // fixed cap
  const { issued, excludedHeld } = await getIssuedAndExcluded();
  const circulating = toFixedStr(Number(issued) - Number(excludedHeld));

  const payload = {
    symbol: "DROP",
    decimals: DECIMALS,
    total_supply: totalSupply,
    circulating_supply: circulating,
    issued_supply: issued,
    excluded_accounts: EXCLUDED,
    issuer: ISSUER,
    updated_at: new Date().toISOString(),
    info: {
      xrpscan: `https://xrpscan.com/account/${ISSUER}`,
    },
  };

  if (!existsSync("docs")) mkdirSync("docs");
  const outPath = "docs/supply.json";

  // only commit if changed
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
