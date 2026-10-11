# Security review | JOA Light 1.0.0

**Review date:** 2026-10-11 (local follow-up verification)  
**Scope:** Historical local review of repository files, generated desktop plugin, packaging and the then-existing GitHub CI configuration.  
**Assurance:** Automated tests and local source inspection. **Not** a formal penetration test, full third-party dependency audit, independent code review, Obsidian acceptance test or proof of zero vulnerabilities.

> **Current package update:** The historical CI/Dependabot configuration discussed below has been removed at the maintainer's request. The repository has no GitHub Actions workflows or Dependabot update configuration. Checks must now run locally; the original date-stamped findings below describe the earlier review.

## Controls verified locally

- GitHub CI token has `contents: read`; checkout credentials are not persisted. External CI actions are referenced by immutable commit hashes. Builds use a dependency lockfile and `npm ci --ignore-scripts`; GitHub CI additionally runs `npm audit --audit-level=high`.
- Plugin application source has no declared network client, telemetry or remote login. Host access is restricted to the Obsidian API import by the generated CommonJS module loader. This is a **code-level restriction in the generated loader**, not a process sandbox or an Obsidian permission boundary.
- Portrait paths are restricted to the plugin art directory. Background uploads require matching MIME and magic signature, a bounded decoded pixel count, and a whitelisted target path. Inputs must be small and WebP when persisted, existing images are size-checked before reading when adapter metadata is available, and the crop UI refuses very large decoded image dimensions.
- Studio data is validated upon opening **and before attempting a write**, without rewriting a good file. The fixed 131,072-byte SQLite layout and unmodified template/schema prefix are required; UTF-8, typed fields, names, entity kinds, stored portrait paths and unexpected nonzero trailing bytes are checked before use. This is not cryptographic authenticity or a general SQLite integrity checker.
- Before mutation, new bytes are written and verified in `sqlite/inventory.sqlite.tmp`; the existing database is read and backed up as `sqlite/inventory.sqlite.bak` and the backup is verified. Only then is the original primary renamed to `.swap`, the verified staging file promoted into place, and the result verified. A failed promotion attempts to restore `.swap` without overwriting a destination. Both the verified `.bak` and any unrecovered `.swap` are retained for manual recovery. If the main file is missing while recovery data exists, initialization refuses to start from an empty database.
- Repository safety checks reject common credential patterns, private vault state, symlinks, and missing mandatory `.github` controls. If a real Git checkout is present, tracked filenames are checked via `git ls-files` (including files ignored after they were staged). Negative regression tests seed fake credentials and forbidden files. Git ignores runtime data without hiding TypeScript code in `src/infrastructure/sqlite/`.
- Single-folder distribution contains `main.js`, `manifest.json`, `styles.css` and modular sources; no Git history, local SQLite DB, user portraits, tokens or plugin `data.json` are bundled.

## Follow-up verification | 2026-10-11

- **184 of 184 automated Node tests pass**, including 13 added adversarial checks (malformed data, data validation at write, truncation and Windows-like rename/read/write/remove fault injection). This is a local test count, not a count of formally audited vulnerabilities.
- **Chromium DOM smoke test with a mocked Obsidian API passed.** The real generated `main.js` and `styles.css` are used with the actual shipped default landscape, narrative PNG and one MP3 fixture. Tests cover command registration, F3 studio opening, both mist controls, text insertion, second opening, tab changes and Escape. No simulated Notice or unhandled browser errors occurred. Run with `python tests/browser-obsidian-shim-smoke.py` if Playwright and Chromium are installed. Audio output itself is stubbed: this test does not certify physical sound playback.
- **SQLite checks:** both fresh and sample-populated databases were opened with Python's SQLite implementation and reported `PRAGMA integrity_check = ok`. This checks those sample files, not every possible future file.
- **Offline npm audit:** local cached vulnerability information reported zero advisories, but this does **not** establish a current registry/security-database result. Offline `npm ci` could not complete because the TypeScript 5.9.3 tarball was not cached; the project was compiled with the local TypeScript toolchain. The maintainer must run a network-backed `npm ci` and `npm audit` manually before release.
- **Release boundary:** automated checks cover private-file exclusions, pinned CI action hashes, clean single-folder packaging, 240 canonical SHA-256 audio files, and generated runtime parity.
- **Not performed:** an actual Windows VM, real installed Obsidian desktop GUI/manual user journey, external independent auditor, true penetration test, and live registry vulnerability feed. This local follow-up must not be represented as any of those activities.

See [`VERIFICATION_2026-10-11_TR.md`](./VERIFICATION_2026-10-11_TR.md) for a Turkish report and the explicit Windows acceptance checklist.

## Known limitations and residual risks

1. **No zero-vulnerability claim:** security depends on Obsidian/Electron, the OS, other installed plugins and eventual updates. Obsidian community plugins can access broad local resources. The local safety scan is pattern-based and cannot prove the absence of secrets or malware.
2. **Local data is unencrypted:** the `.sqlite` file and `.bak` recovery snapshot contain personal writing metadata. Protect disk access, sync destinations and external backups. The file format stores JSON in a bounded ~60 KiB payload in a SQLite container, not relational tables.
3. **Staged replacement is not a crash-proof transaction:** the plugin stages, reads back, backs up and renames through Obsidian’s adapter. Rename/overwrite semantics and fsync durability can vary across filesystems (including Windows and cloud-synced vaults). On a host that refuses replacement, a save may abort safely; the `.bak` is not an automatically restored transaction log. Test recovery on a separate vault and keep external backups.
4. **Image decoders remain a host dependency:** file size and decoded dimension checks limit some resource exhaustion risks; they cannot guarantee arbitrary malformed-image resilience. Keep Obsidian and the OS updated.
5. **Supply-chain checks:** the exact TypeScript version is locked; current online dependency audits must be run manually. A successful live `npm audit` and other online vulnerability databases cannot be verified in an offline package build. Review manually run `npm audit` and test results before pushing.
6. **Account and repo settings:** branch rules, required reviews, 2FA/passkeys, private vulnerability reporting, secret scanning and push protection need to be enabled and checked in GitHub settings separately. ZIP contents cannot configure them.
7. **Git history:** this distribution excludes `.git/` intentionally. If you are editing an existing GitHub Desktop repository, keep its `.git/` directory; check existing history for secrets before a public push. `.gitignore` cannot erase previously committed data.
8. **Acceptance:** a current Windows/macOS/Linux Obsidian smoke test and a recovery drill using test-vault backups should precede a production declaration.

## Responsible reporting

See [`SECURITY.md`](../SECURITY.md) for private vulnerability disclosure. Avoid publicly posting personal `.md` notes, portraits, screenshots, `inventory.sqlite` or `inventory.sqlite.bak` with reports.

## Navigation accessibility

- Navigation tab hover uses a composited two-pixel lift only for fine pointers with hover support. The transform does not change document-flow measurements; reduced-motion users do not receive the lift. Keyboard focus has its own visible outline. Browser smoke tests are useful, but these are not a full real-Obsidian accessibility audit.
