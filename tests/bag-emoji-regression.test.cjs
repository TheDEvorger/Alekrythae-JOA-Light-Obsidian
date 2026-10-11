const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('visible inventory menu is Çanta and interface has meaningful emojis', () => {
  const files = ['MeggySceneModal','StudioTabBar','ScenePanel','CharacterCardsPanel','CharacterCardView','RosterPanel','RosterAddForm','PortraitCropDialog'];
  const ui = files.map(name => fs.readFileSync(`src/presentation/${name}.ts`, 'utf8')).join('\n');
  const modal = fs.readFileSync('src/presentation/StudioTabBar.ts','utf8');
  const cards = fs.readFileSync('src/presentation/CharacterCardView.ts','utf8');
  assert.match(modal, /label: "Çanta", icon: FANTASY_EMOJI\.bag/u);
  assert.match(cards, /"ÇANTA"/u);
  assert.doesNotMatch(ui, /"Envanter"|"ENVANTER"|Envanter notu|envanter notu/u);
  const palette = fs.readFileSync('src/domain/shared/FantasyEmojiCatalog.ts', 'utf8');
  for (const [role, glyph] of [['bag','🎒'],['portrait','💠'],['speech','🗝️'],['meggy','🍲']]) {
    assert.ok(palette.includes(`${role}: "${glyph}"`), `Eksik işlev: ${role}`);
  }
  assert.match(cards, /portrait\.textContent = "\+"/u);
  assert.match(fs.readFileSync("src/presentation/PortraitCropDialog.ts", "utf8"), /FANTASY_EMOJI\.portrait/u);
  assert.doesNotMatch(cards, /"🎒 ÇANTA"/u);
});

test('storage contracts and ⟡ separator stay unchanged', () => {
  const model = fs.readFileSync('src/domain/studio/StudioModels.ts','utf8');
  assert.match(model, /⟡/u);
  const source = fs.readFileSync('src/presentation/CharacterCardView.ts','utf8');
  assert.match(source, /joa-name-separator/u);
  assert.match(source, /this\.autosave\.queue\(card\.id/u);
  assert.doesNotMatch(source, /☯/u);
});
