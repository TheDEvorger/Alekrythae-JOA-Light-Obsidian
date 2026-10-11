const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function walk(folder, ext) {
  return fs.readdirSync(folder, {withFileTypes:true}).flatMap((entry) => {
    const p = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}

test('version contracts agree and the install folder cannot overwrite user data', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const distribution = 'release/joa-frp-writer';
  assert.equal(manifest.version, '1.0.0');
  assert.equal(pkg.version, '1.0.0');
  assert.equal(JSON.parse(fs.readFileSync(path.join(distribution, 'manifest.json'))).version, manifest.version);
  assert.deepEqual(fs.readdirSync(distribution).sort(), ['assets','audio','background-images','main.js','manifest.json','styles.css']);
  assert.equal(fs.readdirSync(path.join(distribution,'audio')).length,240);
  assert.ok(fs.statSync(path.join(distribution,'background-images/default.webp')).size > 1000);
  assert.deepEqual(fs.readdirSync(path.join(distribution, 'assets')).sort(), ['anlati-panel.png']);
  assert.ok(fs.statSync(path.join(distribution,'assets/anlati-panel.png')).size > 1000);
  assert.match(fs.readFileSync(path.join(distribution,'main.js'),'utf8'), /JOA Light/u);
});

test('all handwritten code pieces are at most 300 lines', () => {
  const files = [...walk('src','.ts'), ...walk('styles','.css'), ...walk('tests','.cjs'), 'build-release.cjs','clean.cjs'];
  for (const file of files) {
    const lines = fs.readFileSync(file,'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 300, `${file} is ${lines} lines: split by responsibility`);
  }
  assert.ok(walk('styles','.css').length >= 7);
});

test('no giant inline styles or full-resolution artwork is inserted into Markdown', () => {
  const writing = fs.readFileSync('src/domain/writing/SceneCalloutFormatter.ts', 'utf8');
  assert.doesNotMatch(writing, /base64|<img|sceneImageData/u);
  const code = fs.readFileSync('src/presentation/ScenePanel.ts','utf8');
  assert.doesNotMatch(code, /Sahne görseli ekle|joa-scene-illustration|fileInput\.accept/u);
  assert.match(code, /this\.generateScene\.execute\(this\.dialogue, speaker\)/u);
});

test('responsive overflow containment is present in the release CSS', () => {
  const css = fs.readFileSync('release/joa-frp-writer/styles.css', 'utf8');
  for (const part of ['box-sizing: border-box', 'overflow-wrap: anywhere', 'minmax(0, 1fr)',
    'max-height: calc(100dvh - 24px)', '@media (max-width: 620px)', 'object-fit: cover', 'grid-auto-rows: max-content']) {
    assert.ok(css.includes(part), `Missing containment rule: ${part}`);
  }
});
