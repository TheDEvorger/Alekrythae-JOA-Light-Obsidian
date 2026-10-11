# JOA Light | Architecture

## Product layout

JOA Light is a desktop Obsidian plugin. The repository maintains **44 focused TypeScript modules** and **10 CSS modules**. The supported Obsidian entrypoint is a generated `main.js` CommonJS bundle. Editing the bundle directly is not the development workflow.

```text
src/main.ts (composition root)
  ├── presentation/      UI panels, forms, cards and editor integration
  ├── application/       Use cases and narrow persistence ports
  ├── domain/            Pure story rules, roster model and canonical D240
  ├── infrastructure/    Obsidian vault adapters and portrait rendering
  └── assets/            Immutable canonical artwork
styles/                   Independently maintained CSS sections
```

## Boundaries and responsibilities

- `domain` does not import UI or Obsidian modules.
- `application` coordinates use cases through narrow interfaces.
- `infrastructure` implements persistence and editor-adjacent adapters.
- `presentation` creates views and delegates state mutations to collaborators.
- `main.ts` wires the components and owns plugin lifecycle.

The roster has independent list, editor, form and action components. Character card rendering is separated from autosave. Markdown insertion has a single controlled entrypoint: `SceneEditorInsertion`. Portrait resolution uses `SpeakerDirectory` rather than full repository capabilities. Writes are serialized so reads wait for outstanding updates.

## Storage (important limitation)

`sqlite/inventory.sqlite` is a valid SQLite 3 container with one fixed-size JSON payload, **not** a full normalized relational database. Its payload capacity is approximately 60 KiB. The plugin reports capacity failure instead of silently truncating. Existing files at the **current** plugin location are preserved during initialization. Users should back up their vaults. A relational storage engine is future work and is not included in this release.

Internal storage schema numbers and binary format markers are implementation details, **not public JOA Light release numbers**. Preserve the existing schema to avoid harming data created while testing.

## Automated checks

The test suite covers module size, import direction, cycle detection, editor-write boundary, data round trips, concurrent updates, D240 identity matching, portrait behavior, cursor position and interface constraints. Passing automated tests does not replace acceptance testing in Obsidian on users’ operating systems.

## Licensing

The repository is source-available but proprietary. Consult `LICENSE` and `THIRD_PARTY_NOTICES.md` before reuse or redistribution.
