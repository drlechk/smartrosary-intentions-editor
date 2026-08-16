# SmartRosary Intentions Editor

Browser-only editor for SmartRosary intention NVS partition binaries. It runs
directly from `index.html` in Chrome with no backend.

## What It Does

- imports existing intention partition binaries and `intentions.json`
- decodes and edits intention entries in-browser
- exports compatible `.bin` files
- exports editable `intentions.json`
- loads built-in intention presets generated from `../smartrosary-intentions`
- uploads and downloads intention records over BLE without flashing the full NVS partition on current firmware
- generates published intention binaries from `../smartrosary-intentions`

BLE upload falls back to the legacy full-NVS partition transfer only when the
current firmware lacks the safer intention-entry record characteristic, and only
after warning that already stored intentions will be overwritten and that a
firmware update prevents the risk.

## Run

Open `index.html` directly in Chrome.

## Generate Published Binaries

```sh
node scripts/generate-intentions-binaries.mjs ../smartrosary-web-installer/intentions
```

The generator reads single presets from `intentions/*.json` and multi-entry
packages from `packages/*.json` in `/Users/lech/Projects/smartrosary-intentions`
by default. Use `SMARTROSARY_INTENTIONS_DIR=/path/to/smartrosary-intentions` to
generate from another checkout. It writes each `.bin` plus
`intentions/manifest.json` for dynamic app and installer package lists.

## Generate Editor Presets

The in-page preset selector reads `intentions-presets.js`, generated from the
same canonical single-preset and package definitions:

```sh
node scripts/generate-intentions-presets.mjs
```

Regenerate this file whenever `smartrosary-intentions/intentions/*.json` or
`smartrosary-intentions/packages/*.json` changes.
