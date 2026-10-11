const test = require('node:test');
const assert = require('node:assert/strict');
const { CharacterCardAutoSave } = require('../build/presentation/CharacterCardAutoSave.js');

test('rapid name, surname, and bag edits become a single persisted patch', async () => {
  const written = []; const statuses = [];
  const save = new CharacterCardAutoSave(async (id, patch) => written.push({ id, patch }),
    (id, message) => statuses.push(message), (error) => { throw error; }, 120000);
  save.queue('CHR1', { firstName: 'Mæ' });
  save.queue('CHR1', { lastName: 'V' });
  save.queue('CHR1', { inventoryText: 'Harita ve anahtar' });
  await save.flushAll();
  assert.deepEqual(written, [{ id: 'CHR1', patch: {
    firstName: 'Mæ', lastName: 'V', inventoryText: 'Harita ve anahtar'
  }}]);
  assert.ok(statuses.at(-1).includes('Kaydedildi'));
});

test('writes for the same person serialize rather than racing', async () => {
  const order = []; let resume;
  const save = new CharacterCardAutoSave(async (_id, patch) => {
    order.push(`start:${patch.firstName}`);
    if (patch.firstName === 'İlk') await new Promise((resolve) => { resume = resolve; });
    order.push(`done:${patch.firstName}`);
  }, () => {}, (error) => { throw error; }, 120000);
  save.queue('CHR1', { firstName: 'İlk' });
  const first = save.flushOne('CHR1');
  await new Promise((resolve) => setImmediate(resolve));
  save.queue('CHR1', { firstName: 'Son' });
  const second = save.flushOne('CHR1');
  assert.deepEqual(order, ['start:İlk']);
  resume();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['start:İlk', 'done:İlk', 'start:Son', 'done:Son']);
});

test('a failed database write retains the latest unsaved changes for retry', async () => {
  let attempts = 0; const errors = []; const writes = [];
  const save = new CharacterCardAutoSave(async (_id, patch) => {
    if (++attempts === 1) throw Error('Vault temporarily unavailable');
    writes.push(patch);
  }, () => {}, (error) => errors.push(error), 120000);
  save.queue('CHR1', { inventoryText: 'Kılıç' });
  await save.flushAll();
  assert.equal(errors.length, 1);
  await save.flushAll();
  assert.deepEqual(writes, [{ inventoryText: 'Kılıç' }]);
});

test('discard clears pending edits of a deleted character', async () => {
  const writes = [];
  const save = new CharacterCardAutoSave(async (_id, patch) => writes.push(patch),
    () => {}, (e) => { throw e; }, 120000);
  save.queue('CHR1', { firstName: 'Silinecek' });
  save.discard('CHR1');
  await save.flushAll();
  assert.deepEqual(writes, []);
});
