# Security policy

JOA Light v1.0.0 is an initial public release. Security review is ongoing; there is no security certification, guaranteed response time, or bug bounty.

## Report privately

**Do not file public issues for security vulnerabilities or publish exploit details.**

- Prefer [GitHub private vulnerability reporting](https://github.com/TheDEvorger/Alekrythae-JOA-Light-Obsidian/security/advisories/new) once the repository has been created and private reporting enabled.
- If private reporting is unavailable, use the licensing contact shown in [LICENSE](./LICENSE). Do not send secrets or actual story databases unless the maintainer requests a safe, agreed method.

Include the version, affected feature, impact, and minimal reproduction steps using a disposable test vault. Avoid destructive testing against anyone else's data.

## Security boundaries

- A community plugin runs inside the Obsidian desktop application and can have access to the user's vault. **Only install code you trust.**
- Plugin data is stored locally, but it is **not encrypted by JOA Light**. Storage safety also depends on filesystem access, backup practices, and external sync tools.
- The checked-in source currently contains no intentional telemetry or external login feature. This is **not** a guarantee that Obsidian, other plugins, or third-party infrastructure performs no network activity.
- The automated repository safety check catches common private-data paths and credential markers. It cannot prove the absence of every secret or vulnerability.
- Dependencies must be reviewed manually. There is no GitHub Actions, Dependabot version-update configuration, or automated release workflow in this repository. Run `npm run security:check`, `npm test`, and `npm audit --audit-level=high` locally before release.

See [local data handling](./docs/DATA_AND_PRIVACY.md), [repository hardening](./docs/REPOSITORY_SECURITY.md), and the [license](./LICENSE).
