const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyStudioDatabaseState } = require('../build/domain/studio/StudioModels.js');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');

test('main character cards are free-form inventory notes, not item buckets', () => {
  const state = emptyStudioDatabaseState();
  const service = new StudioStateService();
  const card = service.createMainCharacter(state, 'CHR-1');
  service.updateMainCharacter(state, card.id, {
    firstName: 'Meggy',
    lastName: 'Aster',
    inventoryText: 'Aytaşı hançeri\n17 altın\nAt: Luma'
  });
  const [restored] = service.listMainCharacters(state);
  assert.equal(restored.firstName, 'Meggy');
  assert.equal(restored.lastName, 'Aster');
  assert.match(restored.inventoryText, /17 altın/u);
});

test('living/dead roster combines main characters and NPC/vehicle records', () => {
  const state = emptyStudioDatabaseState();
  const service = new StudioStateService();
  const main = service.createMainCharacter(state, 'CHR-1');
  service.updateMainCharacter(state, main.id, { firstName: 'Meggy', lastName: 'Aster' });
  const npc = service.createRosterEntity(state, 'ENT-1', 'npc');
  service.updateRosterEntity(state, npc.id, { firstName: 'Nara', lastName: 'Vel', lifeStatus: 'dead' });
  const vehicle = service.createRosterEntity(state, 'ENT-2', 'vehicle');
  service.updateRosterEntity(state, vehicle.id, { firstName: 'Ræþ-Þűɇɍ' });

  assert.deepEqual(service.listRoster(state, 'living').map(x => x.name), ['Meggy ⟡ Aster', 'Ræþ-Þűɇɍ']);
  assert.deepEqual(service.listRoster(state, 'dead').map(x => x.name), ['Nara ⟡ Vel']);
});


test('name separator is the lore hollow diamond and editing names persists', () => {
  const state = emptyStudioDatabaseState();
  const service = new StudioStateService();
  const card = service.createMainCharacter(state, 'CHR-NAME');
  assert.equal(card.firstName, '');
  assert.equal(card.lastName, '');
  service.updateMainCharacter(state, card.id, { firstName: 'Mæ’Dáryŋ', lastName: 'Æþ’Mør' });
  const restored = service.listMainCharacters(state)[0];
  assert.equal(restored.firstName, 'Mæ’Dáryŋ');
  assert.equal(restored.lastName, 'Æþ’Mør');
  assert.equal(service.listRoster(state, 'living')[0].name, 'Mæ’Dáryŋ ⟡ Æþ’Mør');
  service.updateMainCharacter(state, card.id, { lastName: 'Değiştirildi' });
  assert.equal(service.listRoster(state, 'living')[0].name, 'Mæ’Dáryŋ ⟡ Değiştirildi');
});
