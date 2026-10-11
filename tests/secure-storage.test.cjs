'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ObsidianStudioFileGateway, STUDIO_DATABASE_PATH, STUDIO_BACKUP_PATH, STUDIO_STAGING_PATH } = require('../build/infrastructure/obsidian/ObsidianStudioFileGateway.js');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec.js');
const { ObsidianSqliteStudioRepository } = require('../build/infrastructure/obsidian/ObsidianSqliteStudioRepository.js');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');
const { ObsidianPortraitStore } = require('../build/infrastructure/obsidian/ObsidianPortraitStore.js');
function vault() {
  const files = new Map();
  const writes = [];
  let failPath;
  let failPromotionOnce = false;
  const adapter = {
    exists: async p => files.has(p),
    mkdir: async p => { files.set(p, null); },
    readBinary: async p => files.get(p),
    writeBinary: async (p,b) => {
      if (p === failPath) throw new Error('Simulated disk failure');
      writes.push(p); files.set(p, b);
    },
    stat: async p => ({size: files.get(p)?.byteLength || 0}),
    rename: async (source, dest) => {
      if (failPromotionOnce && source === STUDIO_STAGING_PATH) {
        failPromotionOnce = false; throw new Error('Simulated disk failure');
      }
      if (dest === failPath) throw new Error('Simulated disk failure');
      if (!files.has(source)) throw new Error('Source missing');
      if (files.has(dest)) throw new Error('Destination file already exists!');
      files.set(dest, files.get(source)); files.delete(source);
      writes.push(`rename:${source}->${dest}`);
    },
    remove: async p => { files.delete(p); }
  };
  return {files,writes,adapter,failAt: p => { failPath = p; }, failPromotion: () => { failPromotionOnce = true; }};
}
const codec = () => new FixedPayloadSqliteCodec();

test('opening existing database reads without rewriting it', async () => {
  const {adapter, writes} = vault();
  const one = new ObsidianSqliteStudioRepository(adapter, codec(), new StudioStateService(), {next: () => 'CHR-1'});
  await one.initialize();
  await one.createMainCharacter();
  const count = writes.length;
  const two = new ObsidianSqliteStudioRepository(adapter, codec(), new StudioStateService(), {next: () => 'CHR-2'});
  await two.initialize();
  assert.equal(writes.length, count, 'plugin startup must not rewrite a valid database');
  assert.equal((await two.listMainCharacters()).length, 1);
});

test('database mutation creates recoverable previous snapshot before writing new state', async () => {
  const {adapter, files, writes} = vault();
  const gw = new ObsidianStudioFileGateway(adapter);
  await gw.ensureExists(Uint8Array.of(1,2));
  await gw.write(Uint8Array.of(3,4));
  assert.deepEqual([...new Uint8Array(files.get(STUDIO_BACKUP_PATH))], [1,2]);
  assert.deepEqual([...new Uint8Array(files.get(STUDIO_DATABASE_PATH))], [3,4]);
  assert.deepEqual(writes.slice(-4), [STUDIO_STAGING_PATH,STUDIO_BACKUP_PATH,
    `rename:${STUDIO_DATABASE_PATH}->${STUDIO_DATABASE_PATH}.swap`,
    `rename:${STUDIO_STAGING_PATH}->${STUDIO_DATABASE_PATH}`]);
  assert.equal(files.has(STUDIO_STAGING_PATH), false);
});

test('failed backup prevents destructive mutation', async () => {
  const v = vault(); const gw = new ObsidianStudioFileGateway(v.adapter);
  await gw.ensureExists(Uint8Array.of(7)); v.failAt(STUDIO_BACKUP_PATH);
  await assert.rejects(() => gw.write(Uint8Array.of(8)), /Simulated disk failure/);
  assert.deepEqual([...new Uint8Array(v.files.get(STUDIO_DATABASE_PATH))], [7]);
});

test('missing primary with backup fails closed rather than replacing user data', async () => {
  const v = vault(); const gw = new ObsidianStudioFileGateway(v.adapter);
  v.files.set(STUDIO_BACKUP_PATH,Uint8Array.of(9).buffer);
  await assert.rejects(() => gw.ensureExists(Uint8Array.of(1)), /yedeği var/);
  assert.equal(v.files.has(STUDIO_DATABASE_PATH), false);
});

test('local persisted state validates field shapes and rejects unsafe portrait paths', () => {
  const c = codec(), db = c.createEmptyDatabase(); const state = c.readState(db);
  state.roster['ENT-1'] = {id:'ENT-1', kind:'npc', firstName:'Elf', lastName:'', lifeStatus:'living'};
  assert.equal(c.readState(c.writeState(db,state)).roster['ENT-1'].firstName,'Elf');
  state.roster['ENT-1'].portraitPath = '../../outside.png';
  assert.throws(() => c.writeState(db,state), /portre yolu geçersiz/);
  delete state.roster['ENT-1'].portraitPath;
  state.roster['ENT-1'].kind = 'unknown';
  assert.throws(() => c.writeState(db,state), /kayıt türü geçersiz/);
});

test('portrait store rejects unknown file types and oversized vault art', async () => {
  const v = vault(), store = new ObsidianPortraitStore(v.adapter);
  await assert.rejects(() => store.save('CHR-1',Uint8Array.of(1,2,3).buffer), /boyutu geçersiz/);
  const twelve = new Uint8Array(12); twelve.set(Buffer.from('RIFF'),0); twelve.set(Buffer.from('WEBP'),8);
  await store.save('CHR-1',twelve.buffer);
  const path = '.obsidian/plugins/joa-frp-writer/art/CHR-1.webp';
  assert.match(await store.getDataUrl(path), /^data:image\/webp;base64,/);
  v.files.set(path,new Uint8Array(1_000_001).buffer);
  assert.equal(await store.getDataUrl(path),undefined);
});

test('bundle only imports the Obsidian host natively and blocks unresolved internal paths', () => {
  const js = fs.readFileSync('main.js','utf8');
  assert.match(js,/request === "obsidian"/);
  assert.match(js,/Unapproved native dependency/);
  assert.match(js,/Unknown internal module/);
  assert.match(js,/Module path escapes root/);
  assert.doesNotMatch(js,/return __nativeRequire\(id\)/);
});

test('gitignore protects local vault data without hiding SQLite source modules', () => {
  const ignore = fs.readFileSync('.gitignore','utf8');
  assert.doesNotMatch(ignore,/^\*\*\/sqlite\/$/m,'do not ignore typed SQLite sources');
  assert.match(ignore,/\*\*\/\.obsidian\//);
  assert.match(ignore,/\*\*\/art\/\*\.webp/);
  assert.match(ignore,/\*\*\/data\.json/);
});

test('oversized image dimensions are rejected before crop rendering', () => {
  const src = fs.readFileSync('src/presentation/PortraitCropDialog.ts','utf8');
  assert.match(src,/next\.naturalWidth \* next\.naturalHeight > 32_000_000/);
  assert.match(src,/file\.size > 12_000_000/);
});

test('staging file is verified and rename failure keeps original and backup', async () => {
  const v = vault(), gw = new ObsidianStudioFileGateway(v.adapter);
  await gw.ensureExists(Uint8Array.of(2,3)); v.failPromotion();
  await assert.rejects(() => gw.write(Uint8Array.of(4,5)), /Simulated disk failure/);
  assert.deepEqual([...new Uint8Array(v.files.get(STUDIO_DATABASE_PATH))], [2,3]);
  assert.deepEqual([...new Uint8Array(v.files.get(STUDIO_BACKUP_PATH))], [2,3]);
  assert.equal(v.files.has(STUDIO_STAGING_PATH), false);
});

test('stale temporary database prevents overwriting a missing original', async () => {
  const v = vault(), gw = new ObsidianStudioFileGateway(v.adapter);
  v.files.set(STUDIO_STAGING_PATH,Uint8Array.of(4).buffer);
  await assert.rejects(() => gw.ensureExists(Uint8Array.of(1)), /geçici kaydı/);
  assert.equal(v.files.has(STUDIO_DATABASE_PATH), false);
});

test('Windows adapter rejects replacing an existing destination but safe swap succeeds', async () => {
  const v = vault(), gw = new ObsidianStudioFileGateway(v.adapter);
  await gw.ensureExists(Uint8Array.of(1,2,3));
  await gw.write(Uint8Array.of(3,2,1));
  assert.deepEqual([...new Uint8Array(v.files.get(STUDIO_DATABASE_PATH))], [3,2,1]);
  assert.deepEqual([...new Uint8Array(v.files.get(STUDIO_BACKUP_PATH))], [1,2,3]);
  assert.equal(v.files.has(STUDIO_STAGING_PATH), false);
  assert.equal(v.files.has(`${STUDIO_DATABASE_PATH}.swap`), false);
});

test('interrupted Windows swap never creates an empty user database', async () => {
  const v = vault(), gw = new ObsidianStudioFileGateway(v.adapter);
  v.files.set(`${STUDIO_DATABASE_PATH}.swap`,Uint8Array.of(9,8,7).buffer);
  await assert.rejects(() => gw.ensureExists(Uint8Array.of(1,2,3)),/\.swap/);
  assert.equal(v.files.has(STUDIO_DATABASE_PATH),false);
  assert.deepEqual([...new Uint8Array(v.files.get(`${STUDIO_DATABASE_PATH}.swap`))],[9,8,7]);
});
