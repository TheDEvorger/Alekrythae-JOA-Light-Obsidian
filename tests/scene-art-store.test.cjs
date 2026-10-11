const test=require('node:test');
const assert=require('node:assert/strict');
const { GenerateMeggySceneUseCase }=require('../build/application/writing/GenerateMeggySceneUseCase.js');
const { SceneCalloutFormatter }=require('../build/domain/writing/SceneCalloutFormatter.js');
const { RollD240UseCase }=require('../build/application/d240/RollD240UseCase.js');
const { D240Table }=require('../build/domain/d240/D240Table.js');
const { RollCalloutStyleUseCase }=require('../build/application/callout/RollCalloutStyleUseCase.js');
const { CalloutStyleTable }=require('../build/domain/callout/CalloutStyleTable.js');

test('new dialogue never embeds a scene picture while Meggy still rolls D240',()=>{
  let count=0;
  const random={integer(min){count++;return min;}};
  const writer=new GenerateMeggySceneUseCase(new SceneCalloutFormatter(),new RollD240UseCase(new D240Table(),random),new RollCalloutStyleUseCase(new CalloutStyleTable(),random));
  const result=writer.execute('Merhaba.');
  assert.equal(count,2);
  assert.doesNotMatch(result.markdown, /^> /m);
  assert.match(result.markdown, /D240 001/u);
  assert.doesNotMatch(result.markdown,/joa-scene-|data:image|!\[/u);
});
