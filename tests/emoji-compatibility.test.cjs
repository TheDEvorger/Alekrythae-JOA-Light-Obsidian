const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sources = [
  ...fs.readdirSync('src/presentation').filter(f => f.endsWith('.ts')).map(f => `src/presentation/${f}`),
  'src/domain/callout/CalloutStyleTable.ts',
  'styles.css'
];

test('visible controls and the bundled plugin avoid unsupported glyphs and forbidden symbols', () => {
  const compiled = fs.readFileSync('release/joa-frp-writer/main.js', 'utf8');
  for (const file of sources) {
    const content = fs.readFileSync(file, 'utf8');
    // Unicode 13+ pictographs are commonly rendered as empty boxes on Windows 10.
    // Alchemical block glyphs are not ordinary emojis and also lack broad support.
    assert.doesNotMatch(content, /[\u{1FA70}-\u{1FAFF}\u{1F700}-\u{1F77F}\u25A1\uFFFD]/u, `${file} contains a risky glyph`);
    assert.ok(!content.includes(String.fromCodePoint(0x1faa6)), `${file} contains prohibited tombstone`);
    assert.ok(!content.includes(String.fromCodePoint(0x1fa9e)), `${file} contains unsupported mirror pictograph`);
  }
  assert.doesNotMatch(compiled, /[\u{1FA70}-\u{1FAFF}\u{1F700}-\u{1F77F}\u25A1\uFFFD]/u);
  assert.ok(!compiled.includes(String.fromCodePoint(0x1faa6)));
});

test('portrait picker and roster use compatible illustrated icons without changing the canonical name separator', () => {
  const crop = fs.readFileSync('src/presentation/PortraitCropDialog.ts', 'utf8');
  const cards = fs.readFileSync('src/presentation/CharacterCardView.ts', 'utf8');
  const roster = fs.readFileSync('src/presentation/RosterRowView.ts', 'utf8');
  const form = fs.readFileSync('src/presentation/RosterAddForm.ts', 'utf8');
  const callout = fs.readFileSync('src/domain/callout/CalloutStyleTable.ts', 'utf8');
  assert.match(crop, /FANTASY_EMOJI\.portrait/u);
  assert.match(crop, /"Resim seç"/u);
  assert.match(cards, /portrait\.textContent = "\+"/u);
  assert.match(roster, /this\.button\("\+", "joa-roster-portrait"\)/u);
  assert.match(fs.readFileSync("src/presentation/RosterPanel.ts","utf8"), /FANTASY_EMOJI\.scroll/u);
  assert.doesNotMatch(crop, /🔮|🗝️/u);
  assert.match(callout, /label: "İşaret", icon: FANTASY_EMOJI\.fire/u);
  assert.match(cards, /NAME_SEPARATOR/u);
  assert.match(fs.readFileSync('src/domain/studio/StudioModels.ts', 'utf8'), /NAME_SEPARATOR = "⟡"/u);
});
