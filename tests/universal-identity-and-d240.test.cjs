const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { SceneCalloutFormatter } = require('../build/domain/writing/SceneCalloutFormatter.js');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec.js');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');
const { displayName } = require('../build/domain/studio/StudioModels.js');

test('D240 is bold label and colon, followed by content on SAME line', () => {
  const formatter = new SceneCalloutFormatter();
  const result = formatter.event({roll:155,text:'Büyük görüntü, yeni açığa çıkan anlamın çevresinde yeniden düzenleniyor.'}, {label:'Teklif'});
  assert.equal(result, '**Teklif · D240 155:** Büyük görüntü, yeni açığa çıkan anlamın çevresinde yeniden düzenleniyor.');
  assert.doesNotMatch(result, /\n\n/);
  assert.equal(formatter.event({roll:1,text:'Bir işaret'}, {label:'*Yol*'}), '**\\*Yol\\* · D240 001:** Bir işaret');
});

test('existing main character survives identity changes with ID and inventory intact', () => {
  const service = new StudioStateService();
  const codec = new FixedPayloadSqliteCodec();
  const db = codec.createEmptyDatabase();
  const state = codec.readState(db);
  const card = service.createMainCharacter(state,'CHR-FIXED');
  service.updateMainCharacter(state,card.id,{firstName:'Arven',lastName:'Korda',inventoryText:'Gümüş anahtar'});
  service.updateMainCharacter(state,card.id,{title:'Kaptan'});
  service.updateMainCharacter(state,card.id,{title:'Komutan',firstName:'Aren',lastName:'Vela'});
  const saved = codec.readState(codec.writeState(db,state));
  const same = saved.mainCharacters[card.id];
  assert.equal(same.id, 'CHR-FIXED');
  assert.equal(same.inventoryText, 'Gümüş anahtar');
  assert.equal(displayName(same), 'Komutan - Aren ⟡ Vela');
});

test('older SQLite V2 main entries without title stay valid; malformed title fails closed', () => {
  const codec = new FixedPayloadSqliteCodec(), db = codec.createEmptyDatabase();
  const state = codec.readState(db);
  state.mainCharacters['CHR-LEGACY'] = {id:'CHR-LEGACY',firstName:'Lira',lastName:'',inventoryText:'Çanta',lifeStatus:'living'};
  assert.equal(codec.readState(codec.writeState(db,state)).mainCharacters['CHR-LEGACY'].title, undefined);
  state.mainCharacters['CHR-LEGACY'].title = { malicious: true };
  assert.throws(() => codec.readState(codec.writeState(db,state)), /ünvanı geçersiz/);
});

test('all roster kinds are renameable without losing record ID', () => {
  const service = new StudioStateService();
  const state = { version:2, mainCharacters:{}, roster:{} };
  for(const kind of ['npc','place','vehicle','other']) {
    const card=service.createRosterEntity(state,'ENT-'+kind,kind);
    service.updateRosterEntity(state,card.id,{title:'Baş',firstName:'Yeni',lastName:'Ad'});
    assert.equal(displayName(state.roster[card.id]),'Baş - Yeni ⟡ Ad');
    service.updateRosterEntity(state,card.id,{title:'',firstName:'Değişti'});
    assert.equal(state.roster[card.id].id,'ENT-'+kind);
    assert.equal(displayName(state.roster[card.id]),'Değişti ⟡ Ad');
  }
});

test('main cards, Mevcudat and scene selection offer title editing', () => {
  const card=fs.readFileSync('src/presentation/CharacterCardView.ts','utf8');
  const roster=fs.readFileSync('src/presentation/RosterActions.ts','utf8');
  const picker=fs.readFileSync('src/presentation/SceneSpeakerPicker.ts','utf8');
  const modal=fs.readFileSync('src/presentation/MeggySceneModal.ts','utf8');
  const identityEditor=fs.readFileSync('src/presentation/SpeakerIdentityEditor.ts','utf8');
  assert.match(card,/this\.autosave\.queue\(card\.id, \{ title: honorific\.value \}\)/);
  assert.match(roster,/const fields = \{ title: item\.title/);
  assert.match(picker,/this\.actions\.editIdentity\(speaker\)/);
  assert.match(modal,/editSpeakerIdentity\(speaker/);
  assert.match(identityEditor,/updateMainCharacter\(speaker\.id, identity\)/);
  assert.match(identityEditor,/updateRosterEntity\(speaker\.id, identity\)/);
});
