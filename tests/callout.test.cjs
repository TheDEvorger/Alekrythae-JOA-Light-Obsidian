const test = require('node:test');
const assert = require('node:assert/strict');
const { CalloutStyleTable } = require('../build/domain/callout/CalloutStyleTable.js');

test('event callout table is isolated from dialogue category', () => {
  const table = new CalloutStyleTable();
  const all = table.allEntries();
  assert.equal(all.length, 24);
  assert.equal(new Set(all.map(x => x.type)).size, 24);
  assert.ok(all.every(x => x.type.startsWith('joa-')));
  assert.ok(all.every(x => x.type !== 'joa-dialogue'));
});
