const test = require('node:test');
const assert = require('node:assert/strict');
const { SceneEditorInsertion } = require('../build/presentation/SceneEditorInsertion.js');
const { GenerateMeggySceneUseCase } = require('../build/application/writing/GenerateMeggySceneUseCase.js');
const { RollD240UseCase } = require('../build/application/d240/RollD240UseCase.js');
const { D240Table } = require('../build/domain/d240/D240Table.js');
const { RollCalloutStyleUseCase } = require('../build/application/callout/RollCalloutStyleUseCase.js');
const { CalloutStyleTable } = require('../build/domain/callout/CalloutStyleTable.js');
const { SceneCalloutFormatter } = require('../build/domain/writing/SceneCalloutFormatter.js');

test('scene insertion has exactly one editor-write boundary and advances cursor', () => {
  let index = 0;
  const random = {integer() { return [57, 2][index++]; }};
  const markdown = new GenerateMeggySceneUseCase(new SceneCalloutFormatter(),
    new RollD240UseCase(new D240Table(), random),
    new RollCalloutStyleUseCase(new CalloutStyleTable(), random)
  ).execute('Merhaba.').markdown + '\n\n';
  const writes = [], moves = [], events = [];
  const editor = {
    replaceRange: (text, pos) => writes.push({text, pos}),
    setCursor: (pos) => moves.push(pos)
  };
  const insertion = new SceneEditorInsertion(editor, {line: 5, ch: 3}, (pos, done) => events.push({pos, done}));
  insertion.insert(markdown);
  insertion.finish();
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].pos, {line: 5, ch: 3});
  assert.match(writes[0].text, /^Meggy: Merhaba\.\n\n\*\*Keşif · D240 057:\*\* /m);
  assert.doesNotMatch(writes[0].text, /^> /m);
  assert.ok(writes[0].text.endsWith("\n\n"));
  assert.equal(moves[0].ch, 0);
  assert.deepEqual(moves[0], events[0].pos);
  assert.deepEqual(events.map(x => x.done), [false, true]);
});
