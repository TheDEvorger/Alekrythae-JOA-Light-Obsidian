const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec.js');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');
const { displayName } = require('../build/domain/studio/StudioModels.js');
const { ObsidianSqliteStudioRepository } = require('../build/infrastructure/obsidian/ObsidianSqliteStudioRepository.js');

function harness() {
  const files = new Map();
  const adapter = {
    exists: async path => files.has(path),
    mkdir: async path => { files.set(path, null); },
    readBinary: async path => files.get(path),
    writeBinary: async (path, data) => { files.set(path, data); },
    rename: async (src,dst) => { files.set(dst,files.get(src)); files.delete(src); },
    remove: async p => { files.delete(p); }
  };
  let counter = 0;
  const repo = new ObsidianSqliteStudioRepository(
    adapter, new FixedPayloadSqliteCodec(), new StudioStateService(),
    { next: prefix => `${prefix}-${++counter}` }
  );
  return { files, repo };
}

test('NPC title is optional and appears before Ad ⟡ Soyad in SQLite-backed speaker and roster lists', async () => {
  const { repo } = harness();
  await repo.initialize();
  const npc = await repo.createRosterEntity('npc');
  await repo.updateRosterEntity(npc.id, { title: '  Kaptan   ', firstName: 'Arven', lastName: 'Korda' });
  let record = (await repo.listRoster('living')).find(item => item.id === npc.id);
  assert.equal(record.title, 'Kaptan');
  assert.equal(record.name, 'Kaptan - Arven ⟡ Korda');
  assert.equal((await repo.listSpeakers()).find(item => item.id === npc.id).name, record.name);
  await repo.updateRosterEntity(npc.id, { title: 'Komutan' });
  record = (await repo.listRoster('living')).find(item => item.id === npc.id);
  assert.equal(record.name, 'Komutan - Arven ⟡ Korda');
  await repo.updateRosterEntity(npc.id, { title: '' });
  assert.equal((await repo.listRoster('living')).find(item => item.id === npc.id).name, 'Arven ⟡ Korda');
});

test('vehicle/other titles survive field-only updates and reopening repository', async () => {
  const { repo, files } = harness();
  await repo.initialize();
  const vehicle = await repo.createRosterEntity('vehicle');
  const other = await repo.createRosterEntity('other');
  await repo.updateRosterEntity(vehicle.id, { title:'Amiral Gemisi', firstName:'Kara İnci', lastName:'' });
  await repo.updateRosterEntity(other.id, { title:'Usta', firstName:'Sarn', lastName:'Gözcü' });
  await repo.updateRosterEntity(vehicle.id, { lifeStatus: 'dead' });
  assert.equal((await repo.listRoster('dead')).find(r => r.id === vehicle.id).name, 'Amiral Gemisi - Kara İnci');
  const second = new ObsidianSqliteStudioRepository(
    {
      exists: async p => files.has(p), mkdir: async p => { files.set(p,null); },
      readBinary: async p => files.get(p), writeBinary: async (p, data) => { files.set(p,data); },
    rename: async (src,dst) => { files.set(dst,files.get(src)); files.delete(src); },
    remove: async p => { files.delete(p); }
    },
    new FixedPayloadSqliteCodec(), new StudioStateService(), {next:()=> 'UNUSED'}
  );
  await second.initialize();
  assert.equal((await second.listRoster('living')).find(r => r.id === other.id).name, 'Usta - Sarn ⟡ Gözcü');
});

test('legacy records without title remain readable; main characters can now receive title', async () => {
  const { repo, files } = harness();
  const codec = new FixedPayloadSqliteCodec();
  const state = codec.readState(codec.createEmptyDatabase());
  state.roster['ENT-NO-TITLE'] = {id:'ENT-NO-TITLE',kind:'npc',firstName:'Lira',lastName:'Kuzey',lifeStatus:'living'};
  const encoded = codec.writeState(codec.createEmptyDatabase(), state);
  const path = '.obsidian/plugins/joa-frp-writer/sqlite/inventory.sqlite';
  files.set(path, encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength));
  await repo.initialize();
  assert.equal((await repo.listRoster('living'))[0].name, 'Lira ⟡ Kuzey');
  const main = await repo.createMainCharacter();
  await repo.updateMainCharacter(main.id, {firstName:'Alek',lastName:'Mor'});
  assert.equal((await repo.listSpeakers()).find(r => r.id === main.id).name, 'Alek ⟡ Mor');
  await repo.updateMainCharacter(main.id, {title:'Ser',firstName:'Arven',lastName:'Korda'});
  assert.equal((await repo.listSpeakers()).find(r => r.id === main.id).name, 'Ser - Arven ⟡ Korda');
  assert.equal(displayName({firstName:'Alek',lastName:'Mor'}), 'Alek ⟡ Mor');
});

test('roster and main UI both allow title editing and insertion', () => {
  const roster = fs.readFileSync('src/presentation/RosterActions.ts', 'utf8');
  const form = fs.readFileSync('src/presentation/RosterAddForm.ts', 'utf8');
  const dialog = fs.readFileSync('src/presentation/StudioDialog.ts', 'utf8');
  assert.match(form, /form\.append\(kind, title, first, last, save\)/);
  assert.match(roster, /const fields = \{ title: item\.title/);
  assert.match(roster, /title: item\.title \?\? ""/);
  assert.match(dialog, /hasTitle = initial\.title !== undefined/);
  assert.match(dialog, /names\.append\(titleField\.wrapper, colon\)/);
});
