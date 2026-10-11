const test=require('node:test');
const assert=require('node:assert/strict');
const {GenerateMeggySceneUseCase}=require('../build/application/writing/GenerateMeggySceneUseCase.js');
const {RollD240UseCase}=require('../build/application/d240/RollD240UseCase.js');
const {RollCalloutStyleUseCase}=require('../build/application/callout/RollCalloutStyleUseCase.js');
const {D240Table}=require('../build/domain/d240/D240Table.js');
const {CalloutStyleTable}=require('../build/domain/callout/CalloutStyleTable.js');
const {SceneCalloutFormatter}=require('../build/domain/writing/SceneCalloutFormatter.js');

function makeScene(calls){
  const seq=[57,4,99,2];
  return new GenerateMeggySceneUseCase(
    new SceneCalloutFormatter(),
    new RollD240UseCase(new D240Table(),{integer(min,max){calls.push([min,max]); return seq.shift();}}),
    new RollCalloutStyleUseCase(new CalloutStyleTable(),{integer(min,max){calls.push([min,max]); return seq.shift();}})
  );
}
test('Meggy then another main character then Meggy: only Meggy consumes dice and emits events',()=>{
  const calls=[];
  const scene=makeScene(calls);
  const first=scene.execute('Merhaba.',{id:'meggy',name:'Meggy',kind:'main'});
  const other=scene.execute('Selam.',{id:'CHR-777',name:'Alek',kind:'main'});
  const again=scene.execute('Devam.',{id:'meggy',name:'Meggy',kind:'main'});
  assert.equal(first.d240Roll,57);
  assert.equal(again.d240Roll,99);
  assert.equal(other.d240Roll,undefined);
  assert.deepEqual(calls,[[1,240],[1,24],[1,240],[1,24]]);
  assert.match(first.markdown,/D240 057/);
  assert.doesNotMatch(other.markdown,/D240|joa-event|joa-discovery|joa-mystery/);
  assert.match(again.markdown,/D240 099/);
});
