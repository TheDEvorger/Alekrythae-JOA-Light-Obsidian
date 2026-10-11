# Public beta limitations and roadmap

## Current beta limitations (confirmed)

- Desktop-only interface; portable/mobile operation is not supported.
- Current SQLite file uses JSON data in a fixed-size payload of roughly 60 KiB, not normalized SQL tables.
- Twenty-four independently rolled event callout styles are implemented. They do not change any of the 240 canonical lines or audio mappings.
- No full manual compatibility matrix has been completed for each operating system, screen resolution and Obsidian release.
- Existing assets and callout formatting retain JOA's canonical story material; it is not a generic content pack.

## Planned work (not commitments)

1. Relational SQLite architecture with safe backups, schema versioning, readback and rollback tests.
2. Manual acceptance checklist and reproducible UI screenshots from a clean demonstration vault.
3. Accessibility improvements, keyboard navigation, contrast and focus testing.
4. Optional modular settings for writers who do not want D240 in every Meggy scene.
5. More language coverage and a documented portability policy.

Do not treat planned items as release features. Suggestions are welcome through GitHub Issues subject to the project's proprietary license.
