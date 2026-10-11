# JOA Light v1.0.0 | Initial Public Beta

**JOA Light** is the story-first Obsidian desktop companion to **JOA | Journey of Adventure**. Keep writing in Markdown while managing characters, portraits, dialogue and story details in a keyboard-driven studio.

## What is included
- **F3 writing studio**, Esc to return to your Markdown note and per-note cursor position retention.
- Compact story composition layout and a large multi-line writing area.
- 24 fantasy appearance themes, saved backgrounds, blur and five aspect-ratio-preserving image fit modes.
- Bundled 240 local MP3 voice recordings, played only after Meggy inserts a canonical D240 event and exits F3.
- Subtle gold navigation hover with accessible focus indication and no layout movement.
- Character portraits, plain-text Markdown dialogue, freeform bags and living/dead roster.
- **Meggy-only D240**, with all 240 canonical sentences preserved by exact roll number and 24 visual event-callout styles.
- 44 modular TypeScript sources, split CSS, test suite, English/Turkish documentation and conceptual cover artwork.

## Install
1. Back up your Obsidian vault and existing plugin data.
2. Extract the **single-folder ZIP** into `<vault>/.obsidian/plugins/` so that `joa-frp-writer/main.js`, `manifest.json` and `styles.css` exist.
3. Do not include private `sqlite/`, `art/` and `data.json` files when distributing the plugin.
4. Restart Obsidian, enable **JOA Light** under Community plugins and open a Markdown note, then press **F3**.

**Limitations:** Desktop-only public beta; not yet a certified production release. Current JSON-in-SQLite payload is capped at approximately 60 KiB. Only the canonical Meggy speaker triggers D240. The official Obsidian Community directory has not approved or listed this plugin.

**License:** TheDEvorger Universal Proprietary Software License v1.3 (`LicenseRef-TheDEvorger-UPSL-1.3`); source-available, **not open source**. Personal use is limited, and professional/commercial/organizational use is restricted. Read `LICENSE` before use.

**Publication status:** Prepared for its **first public GitHub Release** with tag `1.0.0`. GitHub publication has not been performed by this archive alone.
