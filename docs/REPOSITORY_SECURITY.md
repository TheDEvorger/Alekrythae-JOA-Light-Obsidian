# Repository security and publishing checklist

This document records protective controls for the **first GitHub publication** of JOA Light. It does not claim that the software is vulnerability-free.

## Local checks; no repository automation

- **No GitHub Actions workflow** (`.github/workflows/` is absent): commits do not trigger a bot or CI jobs.
- **No Dependabot version-update file** (`.github/dependabot.yml` is absent): this package does not schedule dependency-update pull requests.
- The manual commands `npm ci --ignore-scripts`, `npm run security:check`, `npm test`, and `npm audit --audit-level=high` remain available. `npm test` builds the plugin and runs regression tests; `security:check` checks common credential/private-data patterns and verifies SHA-256 checksums for all 240 recordings.
- `.gitignore` blocks common private vault state, local databases, user images, credentials, archives, and backup files. The local safety guard checks forbidden filenames, likely secret markers and (when Git is present) tracked filenames. It cannot rule out every secret or vulnerability.
- The `.github/ISSUE_TEMPLATE/` and `.github/CODEOWNERS` files provide issue and repository metadata only; they do not create branches by themselves.

## GitHub settings to review manually

1. **Settings → Security and quality / Code security:** disable **Dependabot security updates** if you do not want security-update pull requests either. Keep dependency alerts enabled if you want warnings without automatic PRs. Exact menu wording can change.
2. **Settings → Actions → General:** you can disable GitHub Actions entirely if you never intend to run workflows. The ZIP contains no workflows regardless of that setting.
3. **Settings → Rules → Rulesets:** protect `main` from force-push and deletion if available; do not require the deleted `Source, privacy and release checks` status check.
4. Enable private vulnerability reporting and account 2FA/passkeys as appropriate. Review repository permissions and avoid committing tokens.
5. Before each public release, inspect `git status`, review Git history for accidentally committed secrets, and run `npm ci --ignore-scripts`, `npm run security:check`, `npm test` and a current, network-backed `npm audit --audit-level=high` manually.
6. Release only reviewed `main.js`, `manifest.json`, `styles.css` and full manual-install ZIP with required audio and background assets. Never include `sqlite/`, `art/`, `data.json`, private notes or local backups.

## Limits and evidence

No static check can guarantee perfect security. Source review, updates, user consent, private issue handling, a test vault, and manual release verification remain necessary. The SHA-pinned dependencies guarantee specific downloaded package contents **provided the package registry and hashes are trusted**; they do not guarantee the contents are vulnerability-free.

References: [GitHub secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use), [GitHub repository security settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository), [GitHub secret scanning](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning).

## Local storage and secure distribution

The SQLite-backed JSON state is not encrypted. Writes use `inventory.sqlite.tmp` staging and validation before recording `inventory.sqlite.bak` and attempting a replacement; these files must **never be committed**. This reduces direct-overwrite risk but is not a formal durability or cross-platform atomicity guarantee. Local `.git/` metadata belongs to the GitHub Desktop checkout and is not a defect; omit it only from distribution ZIPs. The repository `.gitignore` must not hide TypeScript files under `src/infrastructure/sqlite/`. See [security audit](./SECURITY_AUDIT.md).
