# Development and architectural conventions

## Build and test

Use Node.js 22+ and install exact, integrity-locked dependencies without package lifecycle scripts:

```bash
npm ci --ignore-scripts
npm run security:check
npm test
```

`npm test` runs the TypeScript compilation, CommonJS bundler and Node test suite **locally**. This repository intentionally has no GitHub Actions or Dependabot configuration. Manual Obsidian acceptance testing remains necessary, especially cursor/focus, lifecycle behavior, initial installation and portrait cropping.

## Source of truth

- `src/` is the editable TypeScript implementation.
- `styles/` is the editable set of CSS modules.
- `src/main.ts` wires dependencies and registers commands.
- `main.js` and `styles.css` are **generated release outputs**, not the place to make changes.
- `build-release.cjs` synchronizes root `main.js` / `styles.css` and creates `release/joa-frp-writer/` containing the 3 standard Obsidian runtime files.

## Invariants

- Keep the plugin ID `joa-frp-writer` stable so vault data continues to be stored at the documented location.
- Do not change Meggy's canonical image or alter, reorder or synthesize the 240 text entries.
- Preserve the original `⟡` name separator and role-specific fantasy emoji assignments.
- Keep Markdown insertion behind `SceneEditorInsertion`; use narrow ports between layers.
- Keep focused modules small and preserve architectural fitness tests.
- Never include local `data.json`, `art/`, or `sqlite/` in published release assets.
- Never silently overwrite or migrate an existing user database without safe backups and a tested rollback procedure.

## Pull requests and contributions

The project uses a proprietary license. The license includes special contribution terms. Before contributing, read Section 22 of [`LICENSE`](../LICENSE); contributions may grant the licensor broad rights. Please open an issue first for a proposed material architectural change. Public visibility does not constitute a general right to redistribute altered versions.
