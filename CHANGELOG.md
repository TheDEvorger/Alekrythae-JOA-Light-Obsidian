# Changelog

Public releases of JOA Light follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-10

### Initial Public Beta

- Desktop-only Obsidian storytelling workspace invoked with **F3**.
- Character/NPC/vehicle roster, portraits, freeform bags, living/dead statuses and text-first Markdown dialogue.
- Canonical Meggy portrait and numbered D240 table containing exactly 240 unchanged lines.
- Twenty-four independent D240 event labels, stored note cursor positions and keyboard navigation.
- Compact speaker selection and confirm controls with a full-height multiline writing area.
- 24 fantasy themes, saved backgrounds, two independent mist/blur sliders and five aspect-ratio-preserving image fit modes.
- Canonical 240 voice MP3s trigger automatically after Meggy's D240 insertion and F3 close.
- Responsive navigation with subtle gold hover, visible keyboard focus and reduced-motion support.
- 56 modular TypeScript sources, 14 CSS modules, tests and bilingual documentation.
- Clean public package excludes private vault databases, settings, portraits and backups.
- Fixed-layout SQLite validation, hardened image type checks and local publish guard.
- TheDEvorger Universal Proprietary Software License v1.3.

### Known limitations

- Desktop-only beta; manual compatibility verification is still required.
- The current SQLite file holds a fixed JSON payload of approximately 60 KiB rather than unlimited relational rows.
- No official Obsidian Community Plugins listing is implied.
- Proprietary license restrictions apply to professional, commercial and organizational use.

### Security verification follow-up (2026-10-11; still 1.0.0 pre-release)

- Reject invalid SQLite state **before** writing, and reject nonzero garbage following an empty or JSON payload.
- Added adversarial read/write/rename fault-injection and corrupt-data regression coverage (184 Node tests).
- Added headless Chromium DOM smoke harness with real shipped media and mocked Obsidian APIs.
- Published explicit verification limits; real Windows/Obsidian acceptance and outside independent audit remain open.
