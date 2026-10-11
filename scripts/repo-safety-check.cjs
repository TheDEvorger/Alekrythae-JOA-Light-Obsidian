"use strict";

// Local publication guard. Pattern scans are not a substitute for secret-scanning
// services, reviewing Git history, or inspecting GitHub's live configuration.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const excludedDirectories = new Set([".git", "node_modules", "build", "release", "coverage", ".idea", ".vscode", ".cache"]);
const textExtensions = new Set([".md", ".txt", ".yml", ".yaml", ".json", ".js", ".ts", ".cjs", ".css", ".svg", ".html", ".toml", ".xml"]);
const forbiddenDirectory = new Set([".obsidian", ".joa", ".ssh", ".aws", ".azure", ".kube", "gcloud", ".gnupg"]);
const forbiddenNames = new Set(["data.json", ".npmrc", ".netrc", ".pypirc", ".git-credentials", "credentials.json", "service-account.json", "service_account.json", "secrets.json", "secrets.yml", "secrets.yaml"]);
const findings = [];
let inspected = 0;

function normalize(relative) { return relative.split(/[\\/]/u).join("/"); }
function forbidden(relative) {
  const parts = normalize(relative).toLowerCase().split("/");
  const name = parts.at(-1);
  const dirs = parts.slice(0, -1);
  if (dirs.some(part => forbiddenDirectory.has(part))) return "private credential, vault or application directory";
  if (dirs.includes("sqlite") && !(normalize(relative).startsWith("src/infrastructure/sqlite/") && name.endsWith(".ts"))) {
    return "local database directory";
  }
  if (dirs.includes("art") && !relative.startsWith("assets/")) return "personal portrait directory";
  if (dirs.includes("background-images") && normalize(relative) !== "background-images/default.webp") return "private background image";
  if (forbiddenNames.has(name)) return "private credential or application state file";
  if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example" && name !== ".env.sample")) return "environment secrets";
  if (/^id_(?:rsa|ed25519|ecdsa|dsa)(?:\.pub)?$/u.test(name)) return "SSH identity material";
  if (/\.(?:sqlite(?:3)?|db3?|s3db|sqlitedb)(?:[-.](?:journal|wal|shm|tmp|bak|swap))?$/u.test(name) || /-(?:journal|wal|shm)$/u.test(name)) return "private database or journal";
  if (/\.(?:pem|p12|pfx|key|p8|keystore|jks|kdbx|zip|7z|rar|tar|tgz|bak|backup|dump|sql|exe|dll|msi)$/u.test(name)) return "private key, archive, binary or backup";
  if (name.startsWith("data.json.") || /\.env(?:\.|$)/u.test(name)) return "local state or environment credentials";
  return null;
}

// Build token detectors in pieces so the scanner does not match its own source.
const rules = [
  ["private key block", new RegExp("-----BEGIN (?:RSA |EC |OPENSSH |DSA )?" + "PRIVATE KEY-----", "u")],
  ["GitHub token", new RegExp("gh" + "[pousr]_[A-Za-z0-9_]{30,}", "u")],
  ["fine-grained GitHub token", new RegExp("github_" + "pat_[A-Za-z0-9_]{30,}", "u")],
  ["AWS key", new RegExp("A" + "KIA[0-9A-Z]{16}", "u")],
  ["Slack token", new RegExp("xox" + "[abprs]-[A-Za-z0-9-]{15,}", "u")],
  ["npm auth token assignment", new RegExp("_auth" + "Token\\s*=\\s*[^\\s$][^\\r\\n]*", "iu")],
  ["authorization bearer token", new RegExp("Authorization\\s*[:=]\\s*[\"' ]?Bearer\\s+[A-Za-z0-9._-]{20,}", "iu")],
  ["Google service credentials", new RegExp('"' + "private_key" + '"\\s*:\\s*"' + "-----BEGIN", "u")]
];

function inspect(relative) {
  const absolute = path.join(root, relative);
  const blocked = forbidden(relative);
  if (blocked) findings.push(`${relative}: ${blocked}`);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) { findings.push(`${relative}: symlink requires explicit review`); return; }
  if (!stat.isFile()) return;
  inspected++;
  if (stat.size > 10_000_000 && (textExtensions.has(path.extname(relative).toLowerCase()) || !path.extname(relative))) {
    findings.push(`${relative}: oversized file cannot be safely scanned`); return;
  }
  if (!textExtensions.has(path.extname(relative).toLowerCase()) && path.extname(relative) !== "") return;
  const content = fs.readFileSync(absolute, "utf8");
  for (const [label, pattern] of rules) if (pattern.test(content)) findings.push(`${relative}: possible ${label}`);
}

function walk(dir, prefix = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (forbiddenDirectory.has(entry.name.toLowerCase())) {
        findings.push(`${relative}/: private directory found`);
        continue;
      }
      walk(path.join(dir, entry.name), relative);
    } else inspect(relative);
  }
}

walk(root);
// Git ignores don't protect files that were already committed or staged.
if (fs.existsSync(path.join(root, ".git"))) {
  try {
    const tracked = execFileSync("git", ["-C", root, "ls-files", "-z", "--cached"], { encoding: "utf8", maxBuffer: 10_000_000 });
    for (const file of tracked.split("\0").filter(Boolean)) {
      const violation = forbidden(normalize(file));
      if (violation) findings.push(`${file}: tracked by Git despite ${violation}`);
    }
  } catch (error) { findings.push(`could not inspect tracked Git files: ${error.message}`); }
}
for (const required of [
  ".github/CODEOWNERS",
  ".github/ISSUE_TEMPLATE/bug_report.yml", ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml", ".github/pull_request_template.md"
]) {
  if (!fs.existsSync(path.join(root, required))) findings.push(`${required}: required repository protection file is missing`);
}
if (findings.length) {
  process.stderr.write(`Repository safety check FAILED:\n${[...new Set(findings)].map(value => `- ${value}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Repository safety check passed (${inspected} files inspected; tracked Git files checked when available).\n`);
}
