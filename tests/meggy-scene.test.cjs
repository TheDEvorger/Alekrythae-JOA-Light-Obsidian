const test = require('node:test');
const assert = require('node:assert/strict');
const { GenerateMeggySceneUseCase } = require('../build/application/writing/GenerateMeggySceneUseCase.js');
const { SceneCalloutFormatter } = require('../build/domain/writing/SceneCalloutFormatter.js');
const { D240Table } = require('../build/domain/d240/D240Table.js');
const { CalloutStyleTable } = require('../build/domain/callout/CalloutStyleTable.js');
const { RollD240UseCase } = require('../build/application/d240/RollD240UseCase.js');
const { RollCalloutStyleUseCase } = require('../build/application/callout/RollCalloutStyleUseCase.js');
function create(random) {
  return new GenerateMeggySceneUseCase(new SceneCalloutFormatter(),
    new RollD240UseCase(new D240Table(), random), new RollCalloutStyleUseCase(new CalloutStyleTable(), random));
}
test('Meggy writes plain text and a separate plain D240 event', () => {
  const calls=[]; const seq=[173,5];
  const result=create({integer(min,max){calls.push([min,max]);return seq.shift();}})
    .execute('Buradan gitmeliyiz.\nSözüm bu kadar.');
  assert.equal(result.d240Roll,173);
  assert.equal(result.eventStyle,'joa-mystery');
  assert.ok(result.markdown.startsWith('Meggy: Buradan gitmeliyiz.\nSözüm bu kadar.'));
  assert.match(result.markdown, /\n\n\*\*Gizem · D240 173:\*\* /u);
  assert.doesNotMatch(result.markdown, /> \[!/u);
  assert.deepEqual(calls,[[1,240],[1,24]]);
});
test('blank dialogue never consumes a die roll',()=>{
  let called=0;
  assert.throws(()=>create({integer(){called++;return 1;}}).execute('  '),/Konuşma boş olamaz/);
  assert.equal(called,0);
});
test('every confirmed Meggy speech still triggers independent D240',()=>{
  const seq=[1,1,240,7]; let n=0; const scene=create({integer(){return seq[n++];}});
  const first=scene.execute('İlk söz.'); const second=scene.execute('İkinci söz.');
  assert.equal(first.d240Roll,1);
  assert.equal(second.d240Roll,240);
  assert.match(first.markdown,/^Meggy: İlk söz\./u);
  assert.match(second.markdown,/D240 240/u);
  assert.doesNotMatch(first.markdown, /^> /mu);
  assert.equal(n,4);
});
