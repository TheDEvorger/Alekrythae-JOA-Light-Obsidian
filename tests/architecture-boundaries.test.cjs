const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve('src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.ts') && !full.endsWith('.d.ts')) files.push(full);
  }
}
walk(root);
const category = (file) => path.relative(root, file).split(path.sep)[0];
const imports = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const refs = [...source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["'](\.[^"']+)["']/g)]
    .map((m) => path.resolve(path.dirname(file), m[1]) + '.ts');
  imports.set(file, refs);
}

// This test catches architectural regressions after a source file is moved or split.
test('dependencies point inward, not from domain/use cases into UI or storage', () => {
  const allowed = {
    domain: ['domain'],
    application: ['domain', 'application'],
    infrastructure: ['domain', 'application', 'infrastructure', 'assets'],
    presentation: ['domain', 'application', 'presentation', 'assets'],
    assets: ['assets'],
    main: ['domain', 'application', 'infrastructure', 'presentation', 'assets']
  };
  for (const [file, refs] of imports) {
    const current = category(file) === 'main.ts' ? 'main' : category(file);
    for (const ref of refs) {
      assert.ok(fs.existsSync(ref), `${file}: unresolved local dependency ${ref}`);
      assert.ok(allowed[current].includes(category(ref)),
        `${path.relative(root,file)} (${current}) must not depend on ${path.relative(root,ref)} (${category(ref)})`);
    }
  }
});

test('source dependency graph contains no circular module imports', () => {
  const active = new Set(), finished = new Set();
  function visit(file, stack) {
    if (active.has(file)) assert.fail(`Circular dependency: ${[...stack, file].map((x) => path.relative(root,x)).join(' -> ')}`);
    if (finished.has(file)) return;
    active.add(file);
    for (const next of imports.get(file) ?? []) if (imports.has(next)) visit(next, [...stack,file]);
    active.delete(file);
    finished.add(file);
  }
  for (const file of files) visit(file, []);
});

test('presentation uses safe DOM construction rather than HTML-string injection', () => {
  for (const file of files.filter((x) => category(x) === 'presentation')) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\.(?:innerHTML|outerHTML)\s*=/u, file);
  }
});

test('the repository depends on a state codec port, not on a concrete codec', () => {
  const repository = fs.readFileSync(path.join(root,'infrastructure/obsidian/ObsidianSqliteStudioRepository.ts'),'utf8');
  assert.match(repository, /private readonly codec: StudioStateCodec/u);
  assert.doesNotMatch(repository, /import.*FixedPayloadSqliteCodec/u);
  assert.match(repository, /await this\.queue;[\s\S]*return this\.codec\.readState/u);
});


test('read-only callout renderer imports only the narrow speaker query port', () => {
  const source = fs.readFileSync(path.join(root,'infrastructure/obsidian/LiveCalloutArtRenderer.ts'),'utf8');
  assert.match(source, /private readonly studio: SpeakerDirectory/u);
  assert.doesNotMatch(source, /private readonly studio: StudioRepository/u);
});
