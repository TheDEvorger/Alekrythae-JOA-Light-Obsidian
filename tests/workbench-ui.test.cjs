const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('F3 workbench is full viewport and uses three exclusive tabs', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  const modal = fs.readFileSync('src/presentation/StudioTabBar.ts', 'utf8');
  assert.match(css, /\.joa-studio-modal\s*\{[\s\S]*?width:\s*100vw\s*!important/u);
  assert.match(css, /height:\s*100dvh\s*!important/u);
  assert.match(modal, /label: "Meggy"/u);
  assert.match(modal, /label: "Çanta"/u);
  assert.match(modal, /label: "Mevcudat"/u);
  assert.match(fs.readFileSync("src/presentation/MeggySceneModal.ts", "utf8"), /this\.panelRoot\.replaceChildren\(\)/u);
});

test('Meggy portrait is embedded instead of depending on plugin asset paths', () => {
  const modal = fs.readFileSync('src/presentation/StudioTabBar.ts', 'utf8');
  const portrait = fs.readFileSync('src/presentation/EmbeddedMeggyPortrait.ts', 'utf8');
  assert.match(modal, /MEGGY_PORTRAIT_DATA_URL/u);
  assert.match(portrait, /export \{ MEGGY_PORTRAIT_DATA_URL \}/u);
  assert.match(fs.readFileSync('src/assets/CanonicalMeggyPortrait.ts','utf8'), /^export const MEGGY_PORTRAIT_DATA_URL = "data:image\/webp;base64,/u);
});

test('inventory is editable main-character name ⟡ surname and free text', () => {
  const source = fs.readFileSync('src/presentation/CharacterCardView.ts', 'utf8');
  assert.match(source, /this\.input\("Adını yaz/u);
  assert.match(source, /joa-name-separator/u);
  assert.match(source, /separator\.textContent = NAME_SEPARATOR/u);
  assert.match(source, /this\.input\("Soyadını yaz/u);
  assert.doesNotMatch(source, /joa-person-tile|updatePortrait|MEGGY_PORTRAIT_DATA_URL/u);
  assert.match(source, /first\.addEventListener\("input"/u);
  assert.match(source, /last\.addEventListener\("input"/u);
  assert.doesNotMatch(source, /save\.textContent = "Kaydet"/u);
  const autosave = fs.readFileSync('src/presentation/CharacterCardAutoSave.ts', 'utf8');
  assert.match(autosave, /setTimeout\(\(\) => void this\.flush\(id\), this\.debounceMs\)/u);
  assert.match(fs.readFileSync("src/presentation/CharacterCardsPanel.ts", "utf8"), /async flushAll\(\)/u);
  assert.match(source, /joa-free-inventory/u);
  assert.match(fs.readFileSync("src/presentation/CharacterCardsPanel.ts", "utf8"), /deleteMainCharacter/u);
  assert.doesNotMatch(source, /quantity|adjustItem|createInventory/u);
});

test('only Meggy may write Markdown; roster names copy without mutating notes', () => {
  const modal = fs.readFileSync('src/presentation/MeggySceneModal.ts', 'utf8');
  const roster = fs.readFileSync('src/presentation/RosterActions.ts', 'utf8');
  const caseSource = fs.readFileSync('src/application/writing/GenerateMeggySceneUseCase.ts', 'utf8');
  assert.match(fs.readFileSync("src/presentation/SceneEditorInsertion.ts", "utf8"), /private position: EditorPosition/u);
  assert.match(fs.readFileSync("src/presentation/SceneEditorInsertion.ts", "utf8"), /this\.editor\.replaceRange\(insertion, this\.position\)/u);
  assert.equal((fs.readFileSync("src/presentation/SceneEditorInsertion.ts", "utf8").match(/this\.editor\.replaceRange\(/gu) || []).length, 1);
  assert.doesNotMatch(roster, /insertName|replaceRange|replaceSelection|vault\.modify/u);
  assert.match(roster, /navigator\.clipboard\.writeText\(name\)/u);
  assert.match(caseSource, /this\.rollD240\.execute\(\)/u);
  assert.match(caseSource, /this\.rollEventStyle\.execute\(\)/u);
  assert.match(fs.readFileSync("src/presentation/RosterPanel.ts", "utf8"), /FANTASY_EMOJI\.living/u);
  assert.match(fs.readFileSync("src/presentation/RosterPanel.ts", "utf8"), /FANTASY_EMOJI\.dead/u);
  assert.doesNotMatch(roster, /☯|☠|♱|window\.confirm/u);
});


test('scene confirm moved to top and obsolete status/footer copy removed', () => {
  const source = fs.readFileSync('src/presentation/ScenePanel.ts', 'utf8');
  assert.match(source, /this\.picker\.mount\(row\)[\s\S]*row\.appendChild\(this\.commitButton\)/u);
  assert.match(source, /this\.commitButton\.textContent = "Onayla ve nota işle"/u);
  assert.doesNotMatch(source, /joa-auto-roll-badge|joa-action-hint|joa-scene-actions|Tek onay/u);
});

test('four equal character cards per desktop row, with no manual save', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  const source = fs.readFileSync('src/presentation/CharacterCardsPanel.ts', 'utf8');
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/u);
  assert.match(css, /max-width: 1250px/u);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/u);
  assert.doesNotMatch(source, /joa-card-save|window\.confirm/u);
  assert.match(source, /this\.dialog\.confirm\(/u);
  assert.match(fs.readFileSync("src/presentation/CharacterCardView.ts","utf8"), /this\.autosave\.queue\(card\.id/u);
});

test('roster edits names and changes life status of main and NPC entries directly', () => {
  const source = fs.readFileSync('src/presentation/RosterActions.ts', 'utf8');
  assert.match(source, /this\.dialog\.editName/u);
  assert.match(source, /this\.port\.updateMainCharacter\(item\.id, renamed\)/u);
  assert.match(source, /this\.port\.updateRosterEntity\(item\.id, renamed\)/u);
  assert.match(source, /this\.port\.updateMainCharacter\(item\.id, \{ lifeStatus \}\)/u);
  assert.match(source, /this\.port\.updateRosterEntity\(item\.id, \{ lifeStatus \}\)/u);
  assert.doesNotMatch(source, /Ana karakterin yaşam durumunu Envanter/u);
  assert.doesNotMatch(source, /window\.confirm|☯/u);
});

test('JOA-themed alerts and confirmations replace native browser popups', () => {
  const dialog = fs.readFileSync('src/presentation/StudioDialog.ts', 'utf8');
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(dialog, /role", "dialog"/u);
  assert.match(dialog, /aria-modal", "true"/u);
  assert.match(dialog, /joa-dialog-backdrop/u);
  assert.match(css, /\.joa-studio-modal \.joa-dialog-backdrop/u);
});


test('F3/ESC modal keyboard access and minimal header', () => {
  const source = fs.readFileSync('src/presentation/MeggySceneModal.ts', 'utf8');
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(source, /event\.key === "Escape"/u);
  assert.match(source, /event\.key === "F3"/u);
  assert.match(source, /this\.close\(\)/u);
  assert.match(css, /\.joa-studio-modal \.modal-close-button\s*\{[^}]*display:\s*none/u);
  assert.doesNotMatch(source, /joa-shortcut-pill|Çağır/u);
});

test('custom Meggy and D240 callouts have different scoped visual treatments', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(css, /\.callout\[data-callout="joa-dialogue"\]/u);
  assert.match(css, /\.callout\[data-callout="joa-mystery"\]/u);
  assert.match(css, /data:image\/webp;base64,/u);
});

test('scene artwork upload UI is absent; portraits still work', () => {
  const scene = fs.readFileSync('src/presentation/ScenePanel.ts', 'utf8');
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(scene, /joa-scene-compact-row/u);
  assert.doesNotMatch(scene, /joa-scene-person|Meggy konuşuyor/u);
  assert.doesNotMatch(scene, /selectedImage|fileInput|Sahne görseli ekle|sceneArt|previewObjectUrl/u);
  assert.doesNotMatch(css, /joa-scene-illustration\s*\{\s*display:\s*none !important;/u);
});


test('header names the inn rather than tavern', () => {
  const tabBar = fs.readFileSync('src/presentation/StudioTabBar.ts', 'utf8');
  assert.match(tabBar, /Kehribar Menzili Hanı/u);
  assert.doesNotMatch(tabBar, /Kehribar Menzili Tavernası/u);
});
