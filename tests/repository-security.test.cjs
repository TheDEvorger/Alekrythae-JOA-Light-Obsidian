const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const text = name => fs.readFileSync(name, 'utf8');

test('no local vault files or credential markers in the first-publication tree', () => {
  assert.match(execFileSync(process.execPath, ['scripts/repo-safety-check.cjs'], {encoding: 'utf8'}), /check passed/);
});

test('GitHub repository has no scheduled CI or Dependabot automation', () => {
  assert.equal(fs.existsSync('.github/workflows'), false, 'No GitHub Actions workflow directory');
  assert.equal(fs.existsSync('.github/dependabot.yml'), false, 'No automatic Dependabot version updates');
  assert.equal(fs.existsSync('.github/CODEOWNERS'), true, 'Repository ownership metadata retained');
});

test('compiler dependency is exact, integrity-locked, and code owners are declared', () => {
  const pkg = JSON.parse(text('package.json'));
  const lock = JSON.parse(text('package-lock.json'));
  assert.equal(pkg.devDependencies.typescript, '5.9.3');
  assert.equal(lock.packages['node_modules/typescript'].version, '5.9.3');
  assert.match(lock.packages['node_modules/typescript'].integrity, /^sha512-/u);
  assert.match(text('.github/CODEOWNERS'), /@TheDEvorger/u);
  assert.match(text('.github/ISSUE_TEMPLATE/bug_report.yml'), /placeholder: 1\.0\.0/u);
});

test('root Obsidian build artifacts match the generated release artifacts', () => {
  for (const file of ['main.js', 'manifest.json', 'styles.css']) {
    assert.equal(fs.readFileSync(file).compare(fs.readFileSync(`release/joa-frp-writer/${file}`)), 0, file);
  }
});

test('published executable, manifest, styles and proprietary license match recorded SHA-256', () => {
  const { createHash } = require('node:crypto');
  for (const line of text('SHA256SUMS.txt').trim().split('\n')) {
    const [hash, name] = line.split(/\s{2}/u);
    const actual = createHash('sha256').update(fs.readFileSync(name)).digest('hex');
    assert.equal(actual, hash, `Incorrect recorded hash for ${name}`);
  }
});
