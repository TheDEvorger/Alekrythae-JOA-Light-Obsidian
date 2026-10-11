const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p,'utf8');
test('F3 speaker picker restores canonical Meggy portrait and selectable main characters', () => {
  const picker = read('src/presentation/SceneSpeakerPicker.ts');
  assert.match(picker,/MEGGY_PORTRAIT_DATA_URL/);
  assert.match(picker,/this\.imageButton\.appendChild\(img\)/);
  assert.match(picker,/addMain\(\)/);
  assert.match(picker,/this\.actions\.onSelect\(id\)/);
  assert.match(read('src/presentation/MeggySceneModal.ts'),/createMainCharacter\(\)/);
  assert.match(read('src/presentation/ScenePanel.ts'),/this\.picker\.selected\(\)/);
});
test('royal filigree covers all three tabs and popups without expanding controls', () => {
  const css = read('styles/13-royal-filigree.css');
  for (const required of ['.joa-tab-button', '.joa-writing-paper', '.joa-character-card',
    '.joa-roster-form', '.joa-name-row', '.joa-dialog', '.joa-scene-speaker-portrait',
    'background-image: var(--joa-corner-tl)']) assert.ok(css.includes(required),required);
  assert.match(css,/min-height: 69px/);
});
