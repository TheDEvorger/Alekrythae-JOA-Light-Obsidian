# Module inventory | JOA Light 1.0.0

JOA Light's TypeScript modules are grouped by purpose rather than by release history.

| Module area | Responsibility |
|---|---|
| `src/domain/` | State rules, dice tables, formatting and immutable constants |
| `src/application/` | Use cases, contracts, cursor-state service |
| `src/infrastructure/` | Vault I/O, SQLite payload codec, image storage and runtime adapters |
| `src/presentation/` | F3 studio, character cards, roster and portrait dialogs |
| `src/assets/` | Bundled canonical artwork |
| `src/main.ts` | Plugin lifecycle and dependency composition |

Split CSS modules live in `styles/`. The build combines them into `styles.css` and packages compiled TypeScript into `main.js`, as required for normal Obsidian loading.

## Maintainability rules

- Keep presentation components within 180 lines and handwritten modules within 300 lines.
- Avoid presentation-to-storage dependencies that bypass defined interfaces.
- Update only the source modules, never manually edit generated `main.js`.
- Add a focused regression test for each behavior change.
- Preserve `data.json`, `sqlite/` and `art/` in existing installations.
