#!/usr/bin/env python3
"""JOA Light: produce the single-folder GitHub/source + Obsidian install ZIP.

Usage: python scripts/create-distribution.py [output.zip]
Run after npm test. Requires Python 3 and Node for the publication guards.
Output must reside outside the repository to avoid bundling itself.
"""
from __future__ import annotations

import hashlib
import os
import pathlib
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOP_DIRS = {".github", "assets", "audio", "background-images", "docs", "scripts", "src", "styles", "tests"}
TOP_FILES = {
    ".editorconfig", ".gitattributes", ".gitignore", "ARCHITECTURE.md",
    "CHANGELOG.md", "CONTRIBUTING.md", "KURULUM-VE-MIMARI.md", "LICENSE",
    "MODULES.md", "README.md", "RELEASE_NOTES.md", "SECURITY.md",
    "SHA256SUMS.txt", "THIRD_PARTY_NOTICES.md", "build-release.cjs",
    "clean.cjs", "main.js", "manifest.json", "package-lock.json",
    "package.json", "styles.css", "tsconfig.json", "versions.json"
}
REJECT_COMPONENTS = {".git", "node_modules", "build", "release", ".obsidian", ".joa", "__pycache__"}
ROOT_RUNTIME_DIRS = {"sqlite", "art"}


def files_for_distribution() -> list[pathlib.Path]:
    files = []
    for p in sorted(ROOT.rglob("*")):
        rel = p.relative_to(ROOT)
        components = rel.parts
        if any(c in REJECT_COMPONENTS for c in components) or components[0] in ROOT_RUNTIME_DIRS:
            continue
        if p.is_symlink():
            raise SystemExit(f"Cannot publish symlink: {rel}")
        if p.is_dir():
            continue
        if rel.parts[0] not in TOP_DIRS and str(rel) not in TOP_FILES:
            raise SystemExit(f"Unreviewed root file: {rel}")
        if rel.name.startswith(".env") or rel.name == "data.json":
            raise SystemExit(f"Private application state: {rel}")
        if p.suffix.lower() in {".db", ".sqlite", ".bak", ".tmp", ".zip", ".key", ".pem", ".pfx", ".exe"}:
            raise SystemExit(f"Unreviewed file extension: {rel}")
        files.append(p)
    if not all((ROOT / p).is_file() for p in ("main.js", "manifest.json", "styles.css", "README.md", "LICENSE")):
        raise SystemExit("Obsidian runtime or publication documentation is missing")
    return files


def main() -> None:
    output = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "JOA-Light-v1.0.0-GitHub-Clean.zip").resolve()
    if output.suffix.lower() != ".zip" or output.is_relative_to(ROOT):
        raise SystemExit("ZIP output must be a .zip outside the project folder")
    subprocess.run(["node", "scripts/repo-safety-check.cjs"], cwd=ROOT, check=True)
    subprocess.run(["node", "scripts/verify-publication.cjs"], cwd=ROOT, check=True)
    members = files_for_distribution()
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=7, allowZip64=True) as z:
        for path in members:
            rel = path.relative_to(ROOT).as_posix()
            zi = zipfile.ZipInfo(f"joa-frp-writer/{rel}")
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.create_system = 3
            zi.external_attr = 0o100644 << 16
            zi.date_time = (2026, 10, 10, 12, 0, 0)
            z.writestr(zi, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=7)
    with zipfile.ZipFile(output) as z:
        if (bad := z.testzip()):
            raise SystemExit(f"ZIP CRC validation failed: {bad}")
        names = z.namelist()
        if len(names) != len(members) or any(not n.startswith("joa-frp-writer/") or ".." in pathlib.PurePosixPath(n).parts for n in names):
            raise SystemExit("Invalid archive structure")
        if len([n for n in names if n.startswith('joa-frp-writer/audio/MV') and n.endswith('.mp3')]) != 240:
            raise SystemExit("Archive has incomplete canonical D240 audio")
        for blocked in ("joa-frp-writer/data.json", "joa-frp-writer/sqlite/", "joa-frp-writer/art/"):
            if any(n.startswith(blocked) for n in names):
                raise SystemExit(f"Private state leaked into distribution: {blocked}")
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    print(f"Created: {output}\nFiles: {len(members)}\nSHA-256: {digest}")

if __name__ == "__main__":
    main()
