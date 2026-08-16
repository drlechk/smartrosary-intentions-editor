import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const intentionsRoot = path.resolve(
  process.env.SMARTROSARY_INTENTIONS_DIR || path.join(root, "..", "smartrosary-intentions"),
);
const outputPath = path.resolve(process.argv[2] || path.join(root, "intentions-presets.js"));
const intentionsDir = path.join(intentionsRoot, "intentions");
const packagesDir = path.join(intentionsRoot, "packages");

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
    descs: [item.desc || item.description || ""],
  };
}

const presets = [
  ...readJsonFiles(intentionsDir).map(({ id, json }) => {
    const pkg = packageFromSingleIntention(id, json);
    return { id: pkg.id, label: pkg.label, package: pkg };
  }),
  ...readJsonFiles(packagesDir).map(({ id, json }) => {
    const pkgId = json.id || id;
    return {
      id: pkgId,
      label: json.label || pkgId,
      package: { ...json, id: pkgId, label: json.label || pkgId },
    };
  }),
].sort((a, b) => String(a.label).localeCompare(String(b.label), "pl"));

const source = `// Generated from smartrosary-intentions/intentions/*.json and packages/*.json. Do not edit manually.
window.SmartRosaryIntentionsPresets = ${JSON.stringify(presets, null, 2)};
`;

fs.writeFileSync(outputPath, source);
console.log(`Wrote ${path.relative(root, outputPath)} with ${presets.length} presets.`);
