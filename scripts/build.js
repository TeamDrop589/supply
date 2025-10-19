import { Client } from "xrpl";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";

const ISSUER = "rszenFJoDdiGjyezQc8pME9KWDQH43Tswh"; // DROP issuer
const CURRENCY = "DROP";
const DECIMALS = 6;
const WSS = "wss://xrplcluster.com";
const EXCLUDED = []; // add any wallets later if you want to exclude them

function toFixedStr(n) {
  return Number(n).toFixed(DECIMALS);
}

  do {
    const req = {
      command: "account_lines",
      account: ISSUER,
      ledger_index: "validated",
      limit: 400
    };
    if (marker) req.marker = marker; // only include marker when it’s a real string

    const resp = await client.request(req);

    for (const line of resp.result.lines || []) {
      if ((line.currency || "").toUpperCase() !== CURRENCY.toUpperCase()) continue;
      const bal = Number(line.balance);
      if (bal < 0) issued += -bal;
    }
    marker = resp.result.marker;
  } while (marker);


  await client.disconnect();
  return toFixedStr(issued);
}

async function main() {
  const totalSupply = "1000000.000000";
  const issued = await getIssued();
  const circulating = issued; // no exclusions yet

  const payload = {
    symbol: "DROP",
    decimals: DECIMALS,
    total_supply: totalSupply,
    circulating_supply: circulating,
    issuer: ISSUER,
    updated_at: new Date().toISOString(),
    info: {
      xrpscan: `https://xrpscan.com/account/${ISSUER}`
    }
  };

  if (!existsSync("docs")) mkdirSync("docs");
  const outPath = "docs/supply.json";

  let changed = true;
  if (existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, "utf8"));
      changed = JSON.stringify(prev) !== JSON.stringify(payload);
    } catch (_) {}
  }

  if (changed) {
    writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log("Updated docs/supply.json:", payload);
  } else {
    console.log("No change in supply.json; skipping update.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
