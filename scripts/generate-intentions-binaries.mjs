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

globalThis.window = globalThis;

function runScript(file) {
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
}

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({
      id: path.basename(name, ".json"),
      json: JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")),
    }));
}

function packageFromSingleIntention(sourceId, item) {
  const id = item.id || sourceId;
  const title = item.title || item.label || id;
  const desc = item.desc || item.description || "";
  return {
    format: "smartrosary-intentions-v1",
    id,
    label: item.label || title,
    filename: item.filename || `nvs-intentions-${id}.bin`,
    partitionSize: item.partitionSize || 20480,
    nvsVersion: item.nvsVersion || 2,
    numIntentions: 1,
    iS: title,
    titles: [title],
    descs: [desc],
    sourceType: "intention",
  };
}

function packageFromMultiPackage(sourceId, pkg) {
  const id = pkg.id || sourceId;
  return {
    ...pkg,
    id,
    label: pkg.label || id,
    filename: pkg.filename || `nvs-intentions-${id}.bin`,
    sourceType: "package",
  };
}

function readInstallablePackages() {
  const singles = readJsonFiles(path.join(intentionsRoot, "intentions"))
    .map(({ id, json }) => packageFromSingleIntention(id, json));
  const packages = readJsonFiles(path.join(intentionsRoot, "packages"))
    .map(({ id, json }) => packageFromMultiPackage(id, json));
  return [...singles, ...packages].sort((a, b) => {
    const byType = String(a.sourceType).localeCompare(String(b.sourceType));
    if (byType !== 0) return byType;
    return String(a.label).localeCompare(String(b.label), "pl");
  });
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

const manifestItems = [];

for (const pkg of readInstallablePackages()) {
  const id = pkg.id;
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
  manifestItems.push({
    id,
    label: pkg.label || id,
    type: pkg.sourceType === "intention" ? "intention" : "package",
    path: `intentions/${filename}`,
    filename,
    count: expectedCount,
    size: bytes.length,
  });
  console.log(`${filename}: ${bytes.length} bytes, intentions=${parsed.numIntentions}`);
}

const manifest = {
  format: "smartrosary-intentions-manifest-v1",
  version: "1.0",
  items: manifestItems,
};
fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.json: ${manifestItems.length} items`);
