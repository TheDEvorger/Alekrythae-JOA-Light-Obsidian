# JOA Light | User guide

## Starting a writing session

1. Open a Markdown note in Obsidian desktop.
2. Press **F3** to open the JOA Light studio.
3. Choose a speaker and enter dialogue in the speech field (🗝️ is reserved for this function).
4. Confirm insertion. JOA Light inserts readable plain Markdown dialogue at the active writing position.
5. For **Meggy**, F3 closes automatically and plays the audio clip matching the D240 roll. Other characters keep the panel open. Press **Esc** manually to close the panel.

The dialog is the working surface, not a replacement for your Markdown editor. Your story stays in the note. Cursor positions are remembered independently for Markdown files and should survive a normal Obsidian restart.

## Character reference

The main-character cards store names (with the canonical `⟡` name separator), editable cropped portraits, life status and plain-text bags. An empty portrait control can open the portrait editor. The **💠** icon is reserved for the portrait function. Characters in the roster can be sorted by living/dead state and have optional titles. Copies of names go to the clipboard rather than into notes.

## Background & 24 themes

Use the header controls to choose a JPG/PNG/WebP **background**, adjust independent **Diyar Sisi** (studio background) and **Anlatı Sisi** (writing-panel artwork) **blur controls (0–24 px each)**, and select one of five aspect-ratio-preserving fit modes: cover/zoom, contain, fit width, fit height, or natural pixel size. The theme selector contains 24 distinct named presets. These choices persist in `data.json` and do not overwrite cursor bookmarks. Custom background files stay in the local plugin `background-images/` folder, which is excluded from the public repository.

## Meggy and D240

Only the canonical Meggy identifier triggers a D240 roll. A result from 1 to 240 selects the corresponding original sentence, with no paraphrase. The event display style is independently selected from 24 event label variants. Selecting another speaker inserts dialogue only. Meggy's portrait is fixed. When Meggy's Markdown is successfully inserted, the F3 panel closes and the matching `audio/MV{roll}.mp3` clip plays. If autoplay is blocked, use the Obsidian command palette action **Meggy son ses kaydını tekrar oynat**. The 240 recordings are part of the bundled package and remain local.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| F3 does nothing | Open a `.md` note in the editor; verify the plugin is enabled. Check keybind conflicts under Obsidian Hotkeys. |
| Plugin missing after extraction | Confirm `manifest.json`, `main.js`, `styles.css` are directly inside `.obsidian/plugins/joa-frp-writer/`, not in an extra nested directory. |
| Data files unexpectedly missing | Stop; verify you have not replaced/removed `data.json`, `sqlite/`, or `art/`. Restore from a vault backup before further writes. |
| Portrait doesn't update | Reopen the note or restart Obsidian; preserve `art/`. Report the exact Obsidian version, OS and steps. |
| Cannot save new characters | Back up the vault. The fixed-size storage payload can reach capacity; do not delete the database to work around this. |
| Background missing | Verify `background-images/default.webp` exists. Private background selections also live in `background-images/`; never delete them when upgrading. |
| Meggy MP3 is silent | Check `audio/MV1.mp3` through `audio/MV240.mp3` are installed. Retry via the command palette; host autoplay policies may require direct user interaction. |
| UI clipped/too wide | Open an issue with screen size, zoom setting, OS and a redacted screenshot (no private story text). |

## Backups and data protection

Back up the **entire vault** before installing community plugins or making important changes. Never publish or overwrite personal `data.json`, `sqlite/`, `art/` or your custom `background-images/` data. Restore from a tested vault backup if files become corrupted.

## Data recovery and backup

JOA Light stages new data in `sqlite/inventory.sqlite.tmp`, verifies it, and creates `sqlite/inventory.sqlite.bak` before attempting to replace the inventory database. This is a **previous-state snapshot**, not a substitute for a backed-up vault. Keep `sqlite/`, `art/`, and `data.json` out of GitHub. If the main database is missing but its backup is present, JOA Light will stop rather than start an empty database. Back up the entire plugin folder before attempting manual recovery, and review [storage and privacy](./DATA_AND_PRIVACY.md).
