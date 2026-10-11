# Data storage and privacy

JOA Light currently uses a local vault-based workflow. The reviewed TypeScript source does not define fetch/WebSocket or telemetry calls. This is a **description of current source behavior**, not a security audit or a guarantee of what every installed plugin can do. Obsidian plugins generally inherit broad application permissions.

| Data | Location | Intended purpose |
| --- | --- | --- |
| Story text | Your ordinary `.md` files | Narrative writing; inserted Markdown callouts |
| Character and roster state | `.obsidian/plugins/joa-frp-writer/sqlite/inventory.sqlite` | Local data for cards, inventory and roster |
| Previous database snapshot | `.obsidian/plugins/joa-frp-writer/sqlite/inventory.sqlite.bak` | Local recovery copy saved before each successful write |
| Character portrait assets | `.obsidian/plugins/joa-frp-writer/art/` | Locally stored artwork |
| Cursor positions and visual preferences | `.obsidian/plugins/joa-frp-writer/data.json` | Restore writing position and selected theme, blur, fit and image |
| User-selected backgrounds | `.obsidian/plugins/joa-frp-writer/background-images/` | Local wallpapers; `default.webp` is bundled, custom images are private |
| Canonical D240 voice | `.obsidian/plugins/joa-frp-writer/audio/MV1.mp3`–`MV240.mp3` | Local voice playback matching canonical roll number |

**Storage warning:** the current SQLite 3 file embeds JSON in a fixed-size payload of approximately 60 KiB; it does not implement normalized relational tables. Storage is not encrypted by this plugin. Back up the vault externally and treat synced backups and filenames as sensitive. The `.bak` snapshot is not encrypted and cannot replace a verified external backup. Before updates, bytes are staged in `inventory.sqlite.tmp` and checked, then a verified backup is created before attempting to replace the main file. The rename is not a guarantee of durable atomic replacement across every Obsidian host/filesystem. On a missing primary database with a remaining `.bak`, the plugin refuses to create an empty replacement; recovery requires the user's explicit action.

The repository's `.gitignore` deliberately excludes local vault state and database files. **Do not attach real user databases, portraits, private notes or paths to GitHub issues.** Remove sensitive text from screenshots.

No external login or cloud synchronization service is advertised by JOA Light. Obsidian Sync or other third-party services, if independently configured by the user, have their own policies.
