import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const intentionsRoot = path.resolve(
  process.env.SMARTROSARY_INTENTIONS_DIR || path.join(root, "..", "smartrosary-intentions"),
);
const outputPath = path.resolve(process.argv[2] || path.join(root, "intentions-presets.js"));
const packagesDir = path.join(intentionsRoot, "packages");

const presets = fs.readdirSync(packagesDir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(packagesDir, name), "utf8"));
    return {
      id: pkg.id || path.basename(name, ".json"),
      label: pkg.label || pkg.id || path.basename(name, ".json"),
      package: pkg,
    };
  });

const source = `// Generated from smartrosary-intentions/packages/*.json. Do not edit manually.
window.SmartRosaryIntentionsPresets = ${JSON.stringify(presets, null, 2)};
`;

fs.writeFileSync(outputPath, source);
console.log(`Wrote ${path.relative(root, outputPath)} with ${presets.length} presets.`);
