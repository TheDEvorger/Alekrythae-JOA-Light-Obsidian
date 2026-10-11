const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('GitHub release metadata stays in sync and plugin identity remains stable', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const pkg = JSON.parse(read('package.json'));
  const versions = JSON.parse(read('versions.json'));
  assert.equal(manifest.id, 'joa-frp-writer');
  assert.equal(manifest.name, 'JOA Light');
  assert.equal(manifest.version, pkg.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
});

test('proprietary licensing and publication documentation are present', () => {
  const license = read('LICENSE');
  assert.match(license, /UNIVERSAL PROPRIETARY SOFTWARE LICENSE/);
  assert.match(license, /LicenseRef-TheDEvorger-UPSL-1\.3/);
  const readme = read('README.md');
  assert.match(readme, /source-available, not open source/i);
  assert.match(readme, /60 KiB/);
  assert.match(readme, /Only canonical Meggy/i);
  for (const f of ['assets/joa-light-cover.webp','assets/workflow.svg','assets/architecture.svg','docs/README_TR.md','SECURITY.md','THIRD_PARTY_NOTICES.md']) {
    assert.ok(fs.statSync(f).size > 100, `Empty GitHub publication file: ${f}`);
  }
});

test('GitHub package contains no local user database or cursor state', () => {
  for (const f of ['data.json','sqlite/inventory.sqlite','art/','node_modules/']) {
    assert.ok(!fs.existsSync(f), `Private or generated file leaked: ${f}`);
  }
});


test('first public JOA Light release starts with one consistent 1.0.0 tag', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const pkg = JSON.parse(read('package.json'));
  const versions = JSON.parse(read('versions.json'));
  assert.equal(manifest.version, '1.0.0');
  assert.equal(pkg.version, '1.0.0');
  assert.deepEqual(Object.keys(versions), ['1.0.0']);
  assert.match(read('README.md'), /v1\.0\.0/);
  assert.match(read('RELEASE_NOTES.md'), /JOA Light v1\.0\.0/);
  assert.match(read('CHANGELOG.md'), /## \[1\.0\.0\]/);
  assert.doesNotMatch(read('CHANGELOG.md'), /## \[1\.0\.[1-9]\]/);
  assert.match(read('docs/RELEASE_GUIDE.md'), /tag \*\*`1\.0\.0`\*\*/);
});

test('initial release contains no internal version history or pre-public migration code', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const roots = ['src', 'styles', 'docs', 'assets', 'tests', '.github'];
  const scan = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
    const name=path.join(dir,entry.name);
    return entry.isDirectory() ? scan(name) : [name];
  });
  const textFiles = [...roots.flatMap(scan), 'README.md', 'CHANGELOG.md', 'RELEASE_NOTES.md', 'ARCHITECTURE.md', 'MODULES.md', 'KURULUM-VE-MIMARI.md']
    .filter(f => /\.(?:ts|css|cjs|md|yml|svg)$/.test(f) && !/\.webp$/.test(f));
  const obsolete = /\bv0\.\d+(?:\.\d+)?\b|\bv1\.0\.[1-9]\b|\bpre-0\.\d+\b|\bLEGACY_DATABASE_PATH\b|\bLegacyInventoryStateV1\b|\bLEGACY_SPEECH_ICON\b|\.joa\/joa-frp-writer\//u;
  for (const file of textFiles.filter(f => f !== 'tests/github-release-contract.test.cjs')) {
    const content=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(content, obsolete, `Internal-release history leaked into ${file}`);
  }
  assert.deepEqual(Object.keys(JSON.parse(read('versions.json'))), ['1.0.0']);
});
