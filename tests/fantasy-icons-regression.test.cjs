const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (name) => fs.readFileSync(`src/presentation/${name}.ts`, 'utf8');

test('fantasy-themed navigation: tavernkeeper Meggy, adventurer bag, Mevcudat ledger', () => {
  const source = read('StudioTabBar');
  assert.match(source, /label: "Meggy", icon: FANTASY_EMOJI\.meggy/u);
  assert.match(source, /label: "Çanta", icon: FANTASY_EMOJI\.bag/u);
  assert.match(source, /label: "Mevcudat", icon: FANTASY_EMOJI\.roster/u);
  assert.ok(!source.includes(String.fromCodePoint(0x1fab6)));
  assert.ok(!source.includes(String.fromCodePoint(0x1f4be)));
  // Avoid the prohibited tombstone glyph in ALL visible UI, not just navigation.
  const forbidden = String.fromCodePoint(0x1faa6);
  for (const filename of ['MeggySceneModal','ScenePanel','CharacterCardsPanel','RosterPanel','PortraitCropDialog','StudioDialog']) {
    assert.ok(!read(filename).includes(forbidden), `${filename} contains a prohibited glyph`);
  }
});

test('fantasy identity varies by speaker kind without changing writing behavior', () => {
  const scene = read('ScenePanel');
  assert.doesNotMatch(scene, /speakerGlyph/u);
  assert.match(scene, /this\.picker\.selected\(\)/u);
  assert.doesNotMatch(scene, /🍲|👑|🕯️|⛵|🔮/u);
  assert.match(scene, /this\.generateScene\.execute\(this\.dialogue, speaker\)/u);
});

test('no mundane office icons in visible workbench UI; persistence unaffected', () => {
  const source = ['MeggySceneModal','ScenePanel','CharacterCardsPanel','RosterPanel','PortraitCropDialog','StudioDialog']
    .map(read).join('\n');
  for (const old of [0x1fab6,0x1f4be,0x1f5d1,0x1f4cb,0x270f,0x2795,0x1f4dd,0x1f465,0x1f4c2,0x1f5bc].map((cp) => String.fromCodePoint(cp))) {
    assert.ok(!source.includes(old), `obsolete icon remains: ${old}`);
  }
  assert.match(read('CharacterCardView'), /NAME_SEPARATOR/u);
  assert.match(read('CharacterCardView'), /this\.autosave\.queue\(card\.id/u);
  assert.match(read('SceneEditorInsertion'), /this\.editor\.replaceRange\(insertion, this\.position\)/u);
});
