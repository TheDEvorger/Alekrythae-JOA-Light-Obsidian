const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { D240Table } = require('../build/domain/d240/D240Table.js');
const { RollD240UseCase } = require('../build/application/d240/RollD240UseCase.js');
const { CANONICAL_D240_LINES } = require('../build/domain/d240/CanonicalD240Lines.js');

const originalBytes = fs.readFileSync('tests/fixtures/mv-lines.original.json');
const original = JSON.parse(originalBytes.toString('utf8'));
const SOURCE_SHA256 = 'f3f605294c3bb9d0df14dcb4bbb1365034cc7d9214a289eb33b9b86a03339f4b';

test('reference is the exact original 240-sentence MV source, unmodified', () => {
  assert.equal(crypto.createHash('sha256').update(originalBytes).digest('hex'), SOURCE_SHA256);
  assert.equal(Object.keys(original).length, 240);
  assert.deepEqual(Object.keys(original).map(Number), Array.from({ length: 240 }, (_, i) => i + 1));
});

test('all 240 D240 mappings have an exact text match, with original punctuation', () => {
  const table = new D240Table();
  assert.equal(CANONICAL_D240_LINES.length, 240);
  assert.ok(Object.isFrozen(CANONICAL_D240_LINES));
  const entries = table.allEntries();
  assert.equal(entries.length, 240);
  assert.equal(new Set(entries.map(({text}) => text)).size, 240);
  for (let i = 1; i <= 240; i++) {
    assert.equal(entries[i-1].roll, i);
    assert.equal(entries[i-1].text, original[String(i)].text, `D240 ${i} was modified`);
    assert.equal(table.entryFor(i).text, original[String(i)].text);
  }
});

test('invalid roll numbers are rejected and cannot index another line', () => {
  const table = new D240Table();
  for (const bad of [0, -1, 241, 1.1, NaN, Infinity]) {
    assert.throws(() => table.entryFor(bad), /D240 sonucu/);
  }
});

test('roll use case uses fair range 1..240 and exact canonical result', () => {
  const calls = [];
  const random = { integer(a, b) { calls.push([a,b]); return 173; } };
  const useCase = new RollD240UseCase(new D240Table(), random);
  assert.deepEqual(useCase.execute(), {roll:173, text: original['173'].text});
  assert.deepEqual(calls, [[1, 240]]);
});
