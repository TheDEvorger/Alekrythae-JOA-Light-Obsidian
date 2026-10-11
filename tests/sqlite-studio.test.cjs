const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec.js');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');

test('studio state round-trips inside a genuine SQLite 3 container', () => {
  const codec = new FixedPayloadSqliteCodec();
  const service = new StudioStateService();
  const database = codec.createEmptyDatabase();
  assert.equal(new TextDecoder().decode(database.slice(0, 16)), 'SQLite format 3\0');
  const state = codec.readState(database);
  const card = service.createMainCharacter(state, 'CHR-X');
  service.updateMainCharacter(state, card.id, { firstName: 'Meggy', inventoryText: 'Pusula\nAnahtar' });
  const next = codec.writeState(database, state);
  const restored = codec.readState(next);
  assert.equal(service.listMainCharacters(restored)[0].inventoryText, 'Pusula\nAnahtar');
  fs.writeFileSync('build/test-studio.sqlite', next);
});


test('unknown storage schema is rejected without modifying the database', () => {
  const codec = new FixedPayloadSqliteCodec();
  const db = codec.createEmptyDatabase();
  const state = codec.readState(db);
  const copy = structuredClone(state);
  copy.version = 999;
  // Invalid state is rejected before any database bytes are changed.
  assert.throws(() => codec.writeState(db, copy), /şeması geçersiz|veri şeması geçersiz/u);
  assert.equal(codec.readState(db).version, 2);
});
