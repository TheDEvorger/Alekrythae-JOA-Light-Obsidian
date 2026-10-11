const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {FANTASY_EMOJI, APPROVED_FANTASY_EMOJI} = require('../build/domain/shared/FantasyEmojiCatalog.js');
const {SceneCalloutFormatter} = require('../build/domain/writing/SceneCalloutFormatter.js');
const {CalloutStyleTable} = require('../build/domain/callout/CalloutStyleTable.js');

const read = (file) => fs.readFileSync(file, 'utf8');
const presentation = fs.readdirSync('src/presentation').filter(f => f.endsWith('.ts')).map(f => read(path.join('src/presentation', f))).join('\n');

test('💠 belongs to portrait, 🗝️ belongs to the composer and no emoji is reused for different roles', () => {
  assert.equal(FANTASY_EMOJI.portrait, '💠');
  assert.equal(FANTASY_EMOJI.speech, '🗝️');
  const icons = Object.values(FANTASY_EMOJI);
  assert.equal(icons.length, new Set(icons).size, 'each function must own a distinct emoji');
  assert.deepEqual(new Set(icons), new Set(APPROVED_FANTASY_EMOJI));
  const callouts = new CalloutStyleTable().allEntries();
  assert.ok(callouts.every(x => x.icon !== FANTASY_EMOJI.speech && x.icon !== FANTASY_EMOJI.portrait));
  assert.ok(!callouts.some(x => x.icon === FANTASY_EMOJI.scroll));
  assert.ok(presentation.includes('title.textContent = `${FANTASY_EMOJI.portrait} Portre seçimi`'));
  assert.equal((presentation.match(/FANTASY_EMOJI\.portrait/g)||[]).length, 1, 'portrait diamond belongs to one single UI slot');
  assert.ok(!presentation.includes('🔮 Portre') && !presentation.includes('🔮 Yakınlaştır'));
  const speech = new SceneCalloutFormatter().dialogue('Meggy', 'Söz');
  assert.equal(speech, 'Meggy: Söz');
  assert.doesNotMatch(speech, /🗝️/u);
  assert.match(read('src/presentation/ScenePanel.ts'), /FANTASY_EMOJI\.speech/u);
});

test('UI contains no emoji literals outside the approved catalog', () => {
  const segmenter = new Intl.Segmenter('tr', {granularity:'grapheme'});
  for (const filename of ['src/presentation/CharacterCardsPanel.ts','src/presentation/RosterPanel.ts',
    'src/presentation/ScenePanel.ts','src/presentation/PortraitCropDialog.ts',
    'src/presentation/StudioDialog.ts','src/presentation/CharacterCardAutoSave.ts']) {
    const s = read(filename);
    for (const {segment} of segmenter.segment(s)) {
      assert.ok(!/\p{Extended_Pictographic}/u.test(segment), `${filename}: hardcoded ${segment}`);
    }
  }
  const renderer = read('src/infrastructure/obsidian/LiveCalloutArtRenderer.ts');
  assert.doesNotMatch(renderer, /String\.fromCodePoint\(0x1f4ac\)|DIALOGUE_PREFIX/u);
});

test('roster + crop inputs have responsive width and portrait controls never clip text', () => {
  const css = read('styles.css');
  assert.match(css, /\.joa-roster-add,/u);
  assert.match(css, /width: auto; min-width: max-content/u);
  assert.match(css, /\.joa-crop-panel \.joa-crop-zoom-label/u);
  assert.match(css, /grid-template-columns: minmax\(0, max-content\) minmax\(0, 1fr\)/u);
  assert.match(css, /\.joa-roster-form select \{ width: 100%/u);
  assert.match(css, /overflow-wrap: anywhere/u);
});
