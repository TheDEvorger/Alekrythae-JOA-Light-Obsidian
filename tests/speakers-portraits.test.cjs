const test = require('node:test');
const assert = require('node:assert/strict');
const { ObsidianSqliteStudioRepository, STUDIO_DATABASE_PATH } = require('../build/infrastructure/obsidian/ObsidianSqliteStudioRepository.js');
const { ObsidianPortraitStore } = require('../build/infrastructure/obsidian/ObsidianPortraitStore.js');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec.js');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');
const { SceneCalloutFormatter } = require('../build/domain/writing/SceneCalloutFormatter.js');
const fs = require('node:fs');
function harness() {
  const files = new Map();
  const adapter = {
    exists: async p => files.has(p),
    mkdir: async p => { files.set(p,null); },
    readBinary: async p => files.get(p),
    writeBinary: async (p,d) => { files.set(p, d); },
    rename: async (src,dst) => { files.set(dst,files.get(src)); files.delete(src); },
    remove: async p => { files.delete(p); }
  };
  let id = 0;
  const repo = new ObsidianSqliteStudioRepository(adapter, new FixedPayloadSqliteCodec(), new StudioStateService(), {next:prefix=>`${prefix}-${++id}`});
  return {repo,files,adapter};
}
test('selector uses stored identity and determines main/NPC/vehicle dialogue type', async () => {
  const {repo} = harness(); await repo.initialize();
  const main = await repo.createMainCharacter();
  const npc = await repo.createRosterEntity('npc');
  const vehicle = await repo.createRosterEntity('vehicle');
  await repo.updateMainCharacter(main.id,{firstName:'Alek', lastName:'Mor'});
  await repo.updateRosterEntity(npc.id,{firstName:'Lira',lastName:'Kuzey'});
  await repo.updateRosterEntity(vehicle.id,{firstName:'Kara İnci',lastName:''});
  const speakers = await repo.listSpeakers();
  assert.equal(speakers.find(x => x.id === main.id).kind,'main');
  assert.equal(speakers.find(x => x.id === npc.id).kind,'npc');
  assert.equal(speakers.find(x => x.id === vehicle.id).kind,'vehicle');
  const fmt = new SceneCalloutFormatter();
  for (const speaker of speakers) {
    const output = fmt.dialogue(speaker.name, 'Merhaba.', speaker.kind);
    assert.equal(output, `${speaker.name}: Merhaba.`);
    assert.doesNotMatch(output, /^> /m);
  }
  assert.equal((await repo.listSpeakers()).find(x=>x.id===main.id).name,'Alek ⟡ Mor');
});
test('fresh storage is created once and existing characters are never overwritten', async () => {
  const {repo,files,adapter}=harness();
  await repo.initialize();
  const character=await repo.createMainCharacter();
  await repo.updateMainCharacter(character.id,{firstName:'Alek',inventoryText:'Gümüş kılıç'});
  const stored=files.get(STUDIO_DATABASE_PATH);
  assert.equal(new TextDecoder().decode(new Uint8Array(stored).slice(0,16)),'SQLite format 3\0');
  const independent=new ObsidianSqliteStudioRepository(adapter, new FixedPayloadSqliteCodec(), new StudioStateService(),{next:()=> 'unused'});
  await independent.initialize();
  assert.equal((await independent.listMainCharacters())[0].inventoryText,'Gümüş kılıç');
});
test('image bytes are stored in plugin art and path traversal is rejected',async()=>{
  const {adapter, files}=harness();
  const store=new ObsidianPortraitStore(adapter);
  const sample=new Uint8Array([82,73,70,70,20,0,0,0,87,69,66,80]).buffer;
  const path=await store.save('CHR-1',sample);
  assert.equal(path,'.obsidian/plugins/joa-frp-writer/art/CHR-1.webp');
  assert.equal(await store.getDataUrl(path),`data:image/webp;base64,${Buffer.from(sample).toString('base64')}`);
  await assert.rejects(()=>store.save('../secrets',sample),/kimliği geçersiz/);
  assert.equal(await store.getDataUrl('../../wrong'),undefined);
  assert.ok(files.has(path));
});
test('canonical Meggy portrait cannot be overwritten by the portrait store',async()=>{
  const {adapter,files}=harness();
  const store=new ObsidianPortraitStore(adapter);
  await assert.rejects(()=>store.save('meggy',new Uint8Array([1,2,3]).buffer),/kanonik portresi değiştirilemez/);
  await assert.rejects(()=>store.save('MEGGY',new Uint8Array([1,2,3]).buffer),/kanonik portresi değiştirilemez/);
  assert.ok(!files.has('.obsidian/plugins/joa-frp-writer/art/meggy.webp'));
});
test('compact speaker picker leaves canonical Meggy art in header and editable portraits in card UI',()=>{
  const source=fs.readFileSync('src/presentation/ScenePanel.ts','utf8');
  assert.doesNotMatch(source,/changeMeggyPortrait|new PortraitCropDialog|art\/meggy\.webp/);
  assert.match(source,/joa-scene-compact-row/);
  assert.doesNotMatch(source,/MEGGY_PORTRAIT_DATA_URL|new PortraitCropDialog/);
  assert.match(fs.readFileSync('src/presentation/StudioTabBar.ts','utf8'),/MEGGY_PORTRAIT_DATA_URL/);
});
test('image crop UI offers local selection, square preview, zoom, drag and save',()=>{
 const source=fs.readFileSync('src/presentation/PortraitCropDialog.ts','utf8');
 assert.match(source,/fileInput\.accept/); assert.match(source,/canvas\.width = canvas\.height = 320/);
 assert.match(source,/setPointerCapture/); assert.match(source,/zoom\.addEventListener/);
 assert.match(source,/canvas\.toBlob/); assert.match(source,/this\.store\.save/);
});
const { GenerateMeggySceneUseCase } = require('../build/application/writing/GenerateMeggySceneUseCase.js');
const { RollD240UseCase } = require('../build/application/d240/RollD240UseCase.js');
const { D240Table } = require('../build/domain/d240/D240Table.js');
const { RollCalloutStyleUseCase } = require('../build/application/callout/RollCalloutStyleUseCase.js');
const { CalloutStyleTable } = require('../build/domain/callout/CalloutStyleTable.js');
test('vehicle produces only its speech callout without consuming a die roll',()=>{
  let draws=0;
  const random={integer(){ return [23,3][draws++]; }};
  const scene=new GenerateMeggySceneUseCase(new SceneCalloutFormatter(),new RollD240UseCase(new D240Table(),random),new RollCalloutStyleUseCase(new CalloutStyleTable(),random));
  const result=scene.execute('Yola çıkıyoruz.',{id:'ENT-9',name:'Kara İnci',kind:'vehicle'});
  assert.equal(result.markdown, 'Kara İnci: Yola çıkıyoruz.');
  assert.doesNotMatch(result.markdown, /^> /m);
  assert.equal(result.d240Roll,undefined);
  assert.equal(result.eventStyle,undefined);
  assert.doesNotMatch(result.markdown,/D240/);
  assert.equal(draws,0);
});

test('main, NPC, vehicle and other speakers never roll D240 even if named Meggy',()=>{
  const calls=[];
  const random={integer(min,max){ calls.push([min,max]); throw new Error('Unexpected dice roll'); }};
  const scene=new GenerateMeggySceneUseCase(new SceneCalloutFormatter(),new RollD240UseCase(new D240Table(),random),new RollCalloutStyleUseCase(new CalloutStyleTable(),random));
  const roles = [
    {id:'CHR-1',name:'Alek ⟡ Mor',kind:'main',type:'joa-main-speech'},
    {id:'ENT-2',name:'Meggy',kind:'npc',type:'joa-npc-speech'},
    {id:'ENT-3',name:'Gemi',kind:'vehicle',type:'joa-vehicle-speech'},
    {id:'ENT-4',name:'Kule',kind:'other',type:'joa-other-speech'}
  ];
  for (const speaker of roles) {
    const result=scene.execute('Merhaba.',speaker);
    assert.equal(result.markdown, `${speaker.name}: Merhaba.`);
    assert.doesNotMatch(result.markdown, /^> /m);
    assert.equal(result.d240Roll,undefined);
    assert.equal(result.eventStyle,undefined);
  }
  assert.equal(calls.length,0);
});
