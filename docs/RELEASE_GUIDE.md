# GitHub release checklist | JOA Light

## 1. Review before publication

- [ ] Verify ownership and publication permission for code, canonical Meggy portrait, D240 text, 240 matching MP3 recordings and background artwork.
- [ ] Confirm the custom proprietary license is the intended license. GitHub may label it **Custom**; this is expected and not equivalent to OSI open source.
- [ ] Confirm that only fictional/demo data appears in committed assets, tests and screenshots.
- [ ] Run `npm ci --ignore-scripts`, `npm run security:check`, and `npm test` on a clean machine.
- [ ] Optional simulated Chromium smoke (does not substitute for Obsidian): `python tests/browser-obsidian-shim-smoke.py`.
- [ ] **Still pending on a real Windows Obsidian installation** (optional disposable vault setup: `scripts/windows-create-test-vault.ps1`): manually test F3 open/close, background/blur/fit/theme persistence, automatic voice playback, cursor restoration, inventory persistence, portraits and one D240 event in a backup/test vault.
- [ ] Confirm `manifest.json`, `package.json`, `versions.json` versions match and that root `main.js` matches the generated release file. Run `node scripts/verify-publication.cjs` to compare SHA-256 checksums, all 240 audio recordings and the release bundle.
- [ ] Ensure `sqlite/`, `art/`, `data.json`, user-custom background assets, credentials, and private manuscripts are **not** present in the public repo or release ZIP. Check Git history for accidentally committed files.

## 2. Create the GitHub repository

Create a separate repository under **TheDEvorger**, suggested name **JOA-Light-Obsidian**. Upload the **contents of the `joa-frp-writer/` directory** to the GitHub repository root. The `README.md`, `LICENSE` and `manifest.json` must be at repository root. Keep existing main JOA repository separate and linked. Apply the account-side protections described in [`docs/REPOSITORY_SECURITY.md`](./REPOSITORY_SECURITY.md) before the first push.

## 3. Publish release assets

Create the first GitHub Release using the exact tag **`1.0.0`** (no `v` prefix, matching `manifest.json`). Mark it **pre-release** during beta testing. Attach these three files as **individual** release assets:

- `main.js`
- `manifest.json`
- `styles.css`

These three are standard Obsidian entry assets, but they are **not sufficient alone for the complete JOA Light experience**: the manual-install ZIP must also contain `audio/MV1.mp3`–`MV240.mp3` and `background-images/default.webp`. Attach the full, single-folder installation ZIP to the same Release and direct manual installers to it. Do not put real user data in either.

Use the prose in [`RELEASE_NOTES.md`](../RELEASE_NOTES.md) as the release body. The `release/joa-frp-writer/` directory after `npm run build` holds the three standard assets **and** the required audio/background subfolders. The custom single ZIP supplied alongside this repository is extracted to `.obsidian/plugins/`.

## 4. Official Community directory

The public GitHub release is **not** the same as admission to the official Obsidian Community Plugins directory. If desired, submit through the official process after manual testing and address reviewer concerns. Proprietary/closed source is reviewed case-by-case under the Developer Policies; acceptance is not guaranteed.

Official sources:
- https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- https://docs.obsidian.md/community-directory/developer-policies
- https://github.com/obsidianmd/obsidian-sample-plugin
