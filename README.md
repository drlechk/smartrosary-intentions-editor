# SmartRosary Intentions Editor

Browser-only editor for SmartRosary intention NVS partition binaries. It runs
directly from `index.html` in Chrome with no backend.

## What It Does

- imports existing intention partition binaries and `intentions.json`
- decodes and edits intention entries in-browser
- exports compatible `.bin` files
- exports editable `intentions.json`
- uploads and downloads the intention partition over BLE
- generates published intention binaries from `../smartrosary-intentions`

## Run

Open `index.html` directly in Chrome.

## Generate Published Binaries

```sh
node scripts/generate-intentions-binaries.mjs ../smartrosary-web-installer/intentions
```

The generator reads `/Users/lech/Projects/smartrosary-intentions` by default.
Use `SMARTROSARY_INTENTIONS_DIR=/path/to/smartrosary-intentions` to generate
from another checkout.
