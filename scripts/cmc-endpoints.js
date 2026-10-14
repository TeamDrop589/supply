import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENDPOINTS = [
  ["total-supply.txt", "total_supply"],
  ["circulating-supply.txt", "circulating_supply"],
  ["max-supply.txt", "max_supply"]
];

export function writeCmcEndpoints(payload, docsDir = "docs") {
  const changed = [];

  for (const [filename, field] of ENDPOINTS) {
    const value = payload[field];
    if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) {
      throw new TypeError(`Refusing to write a non-numeric ${field} value`);
    }

    const path = join(docsDir, filename);
    const expected = `${value}\n`;
    let previous = null;
    try {
      previous = readFileSync(path, "utf8");
    } catch {}

    if (previous !== expected) {
      writeFileSync(path, expected);
      changed.push(path);
    }
  }

  return changed;
}
