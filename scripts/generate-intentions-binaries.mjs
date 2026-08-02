import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const intentionsRoot = path.resolve(
  process.env.SMARTROSARY_INTENTIONS_DIR || path.join(root, "..", "smartrosary-intentions"),
);
const outputDir = path.resolve(process.argv[2] || path.join(root, "dist", "intentions"));
const packageIds = ["pmkdus-2025", "pmkdus-2026"];

globalThis.window = globalThis;

function runScript(file) {
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
}

function readPackage(id) {
  const file = path.join(intentionsRoot, "packages", `${id}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assertEqualArray(actual, expected, label) {
  if (actual.length !== expected.length) {
    throw new Error(`${label}: expected ${expected.length} entries, got ${actual.length}`);
  }
  for (let i = 0; i < expected.length; i++) {
    if (String(actual[i] ?? "") !== String(expected[i] ?? "")) {
      throw new Error(`${label}[${i}] mismatch`);
    }
  }
}

runScript(path.join(root, "nvs.js"));
fs.mkdirSync(outputDir, { recursive: true });

for (const id of packageIds) {
  const pkg = readPackage(id);
  const expectedCount = pkg.numIntentions | 0;
  const bytes = globalThis.NVS.buildIntentionsBin({
    numIntentions: expectedCount,
    iS: pkg.iS || "",
    titles: pkg.titles || [],
    descs: pkg.descs || [],
  });
  if (bytes.length !== (pkg.partitionSize || 20480)) {
    throw new Error(`${id}: expected ${pkg.partitionSize || 20480} bytes, got ${bytes.length}`);
  }
  const parsed = globalThis.NVS.parseIntentions(bytes);
  if ((parsed.numIntentions | 0) !== expectedCount) {
    throw new Error(`${id}: expected ${expectedCount} intentions, got ${parsed.numIntentions}`);
  }
  assertEqualArray(parsed.titles.slice(0, expectedCount), (pkg.titles || []).slice(0, expectedCount), `${id} titles`);
  assertEqualArray(parsed.descs.slice(0, expectedCount), (pkg.descs || []).slice(0, expectedCount), `${id} descs`);

  const filename = pkg.filename || `nvs-intentions-${id}.bin`;
  fs.writeFileSync(path.join(outputDir, filename), bytes);
  console.log(`${filename}: ${bytes.length} bytes, intentions=${parsed.numIntentions}`);
}
