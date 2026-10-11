"use strict";
/** Reproducible offline artifact & bundled media verification.
 * This check intentionally does NOT claim a malware scan or full audit.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const err = (message) => { throw new Error(`Publication verification: ${message}`); };
const file = (relative) => path.join(root, relative);
function checksum(relative) {
  if (!fs.statSync(file(relative)).isFile()) err(`not a file: ${relative}`);
  return crypto.createHash('sha256').update(fs.readFileSync(file(relative))).digest('hex');
}
function verifyManifest(relative) {
  const list = fs.readFileSync(file(relative), 'utf8').trim().split(/\r?\n/);
  const entries = new Map();
  for (const line of list) {
    const match = /^([a-f0-9]{64})  ([a-zA-Z0-9_.\/-]+)$/.exec(line);
    if (!match) err(`invalid SHA-256 entry in ${relative}`);
    const [, digest, name] = match;
    if (name.startsWith('/') || name.split('/').includes('..') || entries.has(name)) err(`unsafe or duplicate hash entry: ${name}`);
    entries.set(name, digest);
  }
  return entries;
}
function compare(relativeA, relativeB) {
  if (checksum(relativeA) !== checksum(relativeB)) err(`${relativeA} != ${relativeB}`);
}
function verify() {
  const privatePaths = ['data.json', 'sqlite', 'art', '.obsidian', '.joa', 'node_modules'];
  for (const p of privatePaths) if (fs.existsSync(file(p))) err(`local/private state in repository: ${p}`);
  const m = JSON.parse(fs.readFileSync(file('manifest.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(file('package.json'), 'utf8'));
  const versions = JSON.parse(fs.readFileSync(file('versions.json'), 'utf8'));
  if (m.id !== 'joa-frp-writer' || m.version !== pkg.version || versions[m.version] !== m.minAppVersion) err('plugin metadata mismatch');
  const rootSums = verifyManifest('SHA256SUMS.txt');
  if (rootSums.size !== 4) err('expected exactly four published SHA256 entries');
  for (const required of ['main.js', 'manifest.json', 'styles.css', 'LICENSE']) {
    if (checksum(required) !== rootSums.get(required)) err(`stale SHA256SUMS entry: ${required}`);
  }
  const sums = verifyManifest('audio/SHA256SUMS.txt');
  if (sums.size !== 240) err(`expected 240 audio checksums; found ${sums.size}`);
  for (let roll = 1; roll <= 240; roll++) {
    const name = `MV${roll}.mp3`;
    if (checksum(`audio/${name}`) !== sums.get(name)) err(`missing, modified or mismatched canonical clip: ${name}`);
  }
  const actualAudio = fs.readdirSync(file('audio')).filter(name => /\.mp3$/i.test(name));
  if (actualAudio.length !== 240) err(`unexpected extra/missing MP3 files: ${actualAudio.length}`);
  const requiredArt = [
    'assets/joa-light-cover.webp', 'assets/anlati-panel.png', 'assets/studio-showcase.svg',
    'assets/readme-labels.svg', 'assets/workflow.svg', 'assets/architecture.svg',
    'background-images/default.webp'
  ];
  for (const f of requiredArt) if (!fs.statSync(file(f)).isFile()) err(`missing asset: ${f}`);
  const backgrounds = fs.readdirSync(file('background-images')).filter(x => !x.startsWith('.'));
  if (backgrounds.join(',') !== 'default.webp') err('unreviewed custom background in repository');
  if (fs.existsSync(file('release/joa-frp-writer'))) {
    for (const name of ['main.js', 'manifest.json', 'styles.css']) compare(name, `release/joa-frp-writer/${name}`);
    for (let roll = 1; roll <= 240; roll++) {
      compare(`audio/MV${roll}.mp3`, `release/joa-frp-writer/audio/MV${roll}.mp3`);
    }
    compare('background-images/default.webp', 'release/joa-frp-writer/background-images/default.webp');
    compare('assets/anlati-panel.png', 'release/joa-frp-writer/assets/anlati-panel.png');
  }
  process.stdout.write('Publication verification passed: manifest, 240 SHA-256 audio clips, required assets, generated runtime and clean state.\n');
}
try { verify(); } catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 1; }
