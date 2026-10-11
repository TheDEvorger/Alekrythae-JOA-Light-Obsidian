'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec.js');
const { ObsidianBackgroundImages } = require('../build/infrastructure/obsidian/ObsidianBackgroundImages.js');
const { emptyStudioDatabaseState } = require('../build/domain/studio/StudioModels.js');

const codec = () => new FixedPayloadSqliteCodec();

test('fresh installation has version 2 empty state but no stored user records', () => {
  const c = codec();
  const state = c.readState(c.createEmptyDatabase());
  assert.equal(state.version, 2);
  assert.deepEqual(Object.keys(state.mainCharacters), []);
  assert.deepEqual(Object.keys(state.roster), []);
});

test('SQLite rejects foreign large, truncated and tampered structures without repairing user data', () => {
  const c = codec(), pristine = c.createEmptyDatabase();
  const fake = pristine.slice(); fake[50000] ^= 1;
  assert.throws(() => c.readState(fake), /yapısı değişmiş|bozulmuş/u);
  assert.throws(() => c.readState(pristine.slice(0, 50000)), /boyutu/u);
  assert.throws(() => c.readState(new Uint8Array(1000000)), /boyutu/u);
  assert.equal(c.readState(pristine).version, 2);
});

test('SQLite refuses an invalid UTF-8 payload without data loss', () => {
  const c = codec(), bytes = c.writeState(c.createEmptyDatabase(), emptyStudioDatabaseState());
  const marker = Buffer.from('JOA_SQLITE_INVENTORY_V1\0');
  const start = Buffer.from(bytes).indexOf(marker) + marker.length + 4;
  bytes[start] = 0xff;
  assert.throws(() => c.readState(bytes), /encoded|UTF-8|utf-8|valid/u);
});

test('SQLite template given to callers is a safe independent copy', () => {
  const c = codec(); const dirty = c.createEmptyDatabase(); dirty[0] = 0;
  assert.equal(new TextDecoder().decode(c.createEmptyDatabase().subarray(0, 16)), 'SQLite format 3\0');
});

test('background file policy rejects mismatched MIME vs signature', async () => {
  const images = new ObsidianBackgroundImages({exists:async () => false, mkdir:async () => {},writeBinary:async () => { throw new Error('should not write'); }});
  const bytes = new Uint8Array(35); bytes.set([137,80,78,71,13,10,26,10]);
  const file = {size:bytes.length,type:'image/jpeg',arrayBuffer:async () => bytes.buffer};
  await assert.rejects(() => images.save(file), /uyușmuyor|uyuşmuyor/u);
});
