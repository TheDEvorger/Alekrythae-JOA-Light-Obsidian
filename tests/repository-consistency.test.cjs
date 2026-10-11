const test = require('node:test');
const assert = require('node:assert/strict');
const { ObsidianSqliteStudioRepository, STUDIO_DATABASE_PATH } = require('../build/infrastructure/obsidian/ObsidianSqliteStudioRepository.js');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec.js');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');

test('a read waits for an in-progress write and then observes committed character data', async () => {
  const files = new Map();
  let postpone, resume;
  const gate = new Promise((resolve) => { resume = resolve; });
  let delayWrites = false;
  const adapter = {
    exists: async (p) => files.has(p),
    mkdir: async (p) => files.set(p, null),
    readBinary: async (p) => files.get(p),
    writeBinary: async (p, data) => {
      files.set(p, data);
    },
    rename: async (src,dst) => {
      if (delayWrites && dst === STUDIO_DATABASE_PATH) {
        postpone?.();
        await gate;
      }
      files.set(dst,files.get(src)); files.delete(src);
    },
    remove: async p => files.delete(p)
  };
  const repo = new ObsidianSqliteStudioRepository(adapter, new FixedPayloadSqliteCodec(),
    new StudioStateService(), {next: () => 'CHR-1'});
  await repo.initialize();
  const card = await repo.createMainCharacter();
  delayWrites = true;
  const started = new Promise((resolve) => { postpone = resolve; });
  const saving = repo.updateMainCharacter(card.id, { firstName: 'Alek', lastName: 'Mor' });
  await started;
  const read = repo.listMainCharacters();
  let completed = false;
  void read.then(() => {completed = true;});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false, 'read must not return stale data before commit');
  resume();
  await saving;
  const cards = await read;
  assert.equal(cards[0].firstName, 'Alek');
  assert.equal(cards[0].lastName, 'Mor');
});
