const test = require('node:test');
const assert = require('node:assert/strict');
const { SceneCalloutFormatter } = require('../build/domain/writing/SceneCalloutFormatter.js');

test('new dialogue is plain Markdown and never makes a speech bubble', () => {
  const formatter = new SceneCalloutFormatter();
  const result = formatter.dialogue('Meggy', 'Bir satır.\nİkinci satır.');
  assert.equal(result, 'Meggy: Bir satır.\nİkinci satır.');
  assert.doesNotMatch(result, /\[!joa-|^> /mu);
});

test('speaker title and surname stay visible in lightweight notes', () => {
  const formatter = new SceneCalloutFormatter();
  for (const kind of ['meggy', 'main', 'npc', 'vehicle', 'other', 'place']) {
    const markdown = formatter.dialogue('Kaptan - Arven ⟡ Korda', 'Merhaba.', kind);
    assert.equal(markdown, 'Kaptan - Arven ⟡ Korda: Merhaba.');
  }
});

test('speaker Markdown metacharacters cannot impersonate markup', () => {
  const fmt = new SceneCalloutFormatter();
  assert.equal(fmt.dialogue('A*B [C]', 'Söz'), 'A\\*B \\[C\\]: Söz');
});
