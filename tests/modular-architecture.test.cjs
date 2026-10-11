const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ObsidianStudioFileGateway, STUDIO_DATABASE_PATH } = require('../build/infrastructure/obsidian/ObsidianStudioFileGateway.js');

function read(file) { return fs.readFileSync(path.join('src', file), 'utf8'); }
function collect(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? collect(full) : entry.name.endsWith('.ts') && !full.endsWith('.d.ts') ? [full] : [];
  });
}

test('UI implementations are below 180 lines and CSS modules below 180 lines', () => {
  for (const file of [...collect('src/presentation'), ...fs.readdirSync('styles').map(x => path.join('styles', x))]) {
    if (!file.endsWith('.ts') && !file.endsWith('.css')) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 180, `${file}: ${lines} lines; refactor this responsibility`);
  }
});

test('roster actions and visual components have explicit, narrow responsibilities', () => {
  const operations = read('presentation/RosterActions.ts');
  const row = read('presentation/RosterRowView.ts');
  const form = read('presentation/RosterAddForm.ts');
  const card = read('presentation/CharacterCardView.ts');
  const toolbar = read('presentation/StudioTabBar.ts');
  assert.match(operations, /updateRosterEntity/u);
  assert.doesNotMatch(operations, /document\.createElement/u);
  assert.match(row, /document\.createElement/u);
  assert.doesNotMatch(row, /updateRosterEntity\(|deleteRosterEntity\(/u);
  assert.match(form, /createRosterEntity/u);
  assert.doesNotMatch(form, /renderRow|listRoster/u);
  assert.match(card, /CharacterCardCommands/u);
  assert.doesNotMatch(card, /ObsidianSqlite|writeBinary|StudioRepository/u);
  assert.match(toolbar, /setActive\(/u);
  assert.doesNotMatch(toolbar, /StudioRepository|Editor|writeBinary/u);
});

test('there is exactly one editor mutation gate, isolated from database and UI logic', () => {
  const sources = collect('src');
  const writers = sources.filter(file => /\b(?:editor|this\.editor)\.replaceRange\s*\(/u.test(fs.readFileSync(file,'utf8')));
  assert.deepEqual(writers, ['src/presentation/SceneEditorInsertion.ts']);
  const writer = read('presentation/SceneEditorInsertion.ts');
  assert.doesNotMatch(writer, /StudioRepository|PortraitStore|D240Table/u);
  const modal = read('presentation/MeggySceneModal.ts');
  assert.match(modal, /this\.insertion\.insert\(markdown\)/u);
  assert.doesNotMatch(modal, /\.replaceRange\(/u);
});

test('vault file I/O is delegated and existing storage is not overwritten', async () => {
  const repo = read('infrastructure/obsidian/ObsidianSqliteStudioRepository.ts');
  assert.match(repo, /new ObsidianStudioFileGateway\(adapter\)/u);
  assert.doesNotMatch(repo, /\.adapter\.writeBinary|\.adapter\.readBinary|\.adapter\.mkdir/u);
  const files = new Map();
  const writes = [];
  const adapter = {
    exists: async p => files.has(p), mkdir: async p => files.set(p,null),
    readBinary: async p => files.get(p),
    writeBinary: async (p,d) => {writes.push(p);files.set(p,d);},
    rename: async (src,dst) => { files.set(dst,files.get(src)); files.delete(src); },
    remove: async p => { files.delete(p); }
  };
  const gateway = new ObsidianStudioFileGateway(adapter);
  await gateway.ensureExists(Uint8Array.from([9]));
  assert.deepEqual(Array.from(await gateway.read()), [9]);
  const initialWrites = writes.length;
  await gateway.ensureExists(Uint8Array.from([2]));
  assert.equal(writes.length, initialWrites, 'existing database must not be overwritten');
  await gateway.write(Uint8Array.from([4,5]));
  assert.deepEqual(Array.from(new Uint8Array(files.get(STUDIO_DATABASE_PATH))), [4,5]);
});
