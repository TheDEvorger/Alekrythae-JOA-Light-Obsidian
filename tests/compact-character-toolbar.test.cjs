const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('inventory header uses one compact row without the old kicker and explanation', () => {
  const source = fs.readFileSync('src/presentation/CharacterCardsPanel.ts', 'utf8');
  const mount = source.slice(source.indexOf('mount(): void {'), source.indexOf('private async refresh()'));
  assert.match(mount, /joa-section-intro joa-cards-toolbar/);
  assert.match(mount, /"Karakter Kartları"/);
  assert.match(mount, /"0 kişi"/);
  assert.match(mount, /FANTASY_EMOJI\.crown/u);
  assert.match(mount, /header\.append\(heading, actions\)/);
  assert.doesNotMatch(mount, /"joa-kicker"|"joa-section-subtitle"|SQLITE • ANA KARAKTERLER/);
});

test('inventory spacing is scoped and 4-column layout remains unchanged', () => {
  const css = fs.readFileSync('styles.css','utf8');
  assert.match(css, /\.joa-cards-tab\s*\{\s*padding-top:\s*10px;/);
  assert.match(css, /\.joa-cards-tab \.joa-cards-toolbar\s*\{[\s\S]*?min-height:\s*34px;[\s\S]*?margin-bottom:\s*10px;/);
  assert.match(css, /@media \(min-width:1200px\)\s*\{\.joa-character-card-grid \{grid-template-columns:repeat\(4,minmax\(0,1fr\)\);\}\}/);
});
