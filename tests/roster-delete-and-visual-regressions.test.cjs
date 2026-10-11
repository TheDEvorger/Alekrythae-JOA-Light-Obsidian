const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { StudioStateService } = require('../build/domain/studio/StudioStateService.js');
const source = (file) => fs.readFileSync(file, 'utf8');

test('Mevcudat offers delete for all kinds, with explicit confirmation', () => {
  const row = source('src/presentation/RosterRowView.ts');
  const actions = source('src/presentation/RosterActions.ts');
  const port = source('src/presentation/RosterContracts.ts');
  assert.match(row, /tools\.appendChild\(remove\)/u);
  assert.doesNotMatch(row, /if \(item\.source === "roster"\)/u);
  assert.match(actions, /item\.source === "main-character"\) await this\.port\.deleteMainCharacter/u);
  assert.match(actions, /else await this\.port\.deleteRosterEntity/u);
  assert.match(actions, /await this\.dialog\.confirm/u);
  assert.match(port, /deleteMainCharacter\(id: string\)/u);
});

test('deletion routes keep remaining independent entities', () => {
  const s = new StudioStateService();
  const state = {mainCharacters: {}, roster: {}};
  const main = s.createMainCharacter(state, 'CHR-1');
  const np = s.createRosterEntity(state, 'ENT-NPC', 'npc');
  const place = s.createRosterEntity(state, 'ENT-PLACE', 'place');
  const vehicle = s.createRosterEntity(state, 'ENT-VEHICLE', 'vehicle');
  const other = s.createRosterEntity(state, 'ENT-OTHER', 'other');
  s.deleteRosterEntity(state, np.id);
  s.deleteRosterEntity(state, place.id);
  s.deleteRosterEntity(state, vehicle.id);
  s.deleteRosterEntity(state, other.id);
  assert.deepEqual(Object.keys(state.roster), []);
  assert.ok(state.mainCharacters[main.id]);
  s.deleteMainCharacter(state, main.id);
  assert.deepEqual(Object.keys(state.mainCharacters), []);
});

test('compiled stylesheet restores the transparent outer-frame scene and gemstone slider', () => {
  const css = source('styles.css');
  assert.match(css, /\.joa-mist-slider/u);
  assert.match(css, /\.joa-mist-jewel/u);
  assert.match(css, /opacity: 0 !important/u);
  assert.match(css, /Narrative illustration must fill/u);
  assert.match(css, /Single ornate outer frame/u);
  assert.match(css, /\.joa-name-row-actions \{/u);
  assert.match(css, /\.joa-writing-body:focus-within/u);
  assert.match(source('src/domain/shared/FantasyEmojiCatalog.ts'), /roster: "🗺️"/u);
});
