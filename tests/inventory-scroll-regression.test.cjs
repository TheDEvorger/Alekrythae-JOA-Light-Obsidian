const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');

// Reproduces the user's bug: an existing scroll position in the reused tab
// container must be discarded before Inventory (or any other tab) renders.
test('switching tabs resets the previously scrolled panel before mounting cards', async () => {
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'obsidian') return { Modal: class {}, Notice: class {} };
    return originalLoad.call(this, request, parent, isMain);
  };
  let Workbench;
  try { Workbench = require('../build/presentation/MeggySceneModal.js').MeggySceneModal; }
  finally { Module._load = originalLoad; }

  const modal = Object.create(Workbench.prototype);
  let observedScrollDuringReplace = -1;
  const panelRoot = {
    scrollTop: 480, scrollLeft: 38,
    replaceChildren() { observedScrollDuringReplace = this.scrollTop; }
  };
  modal.panelRoot = panelRoot;
  modal.activeTab = 'cards';
  modal.tabButtons = new Map();
  modal.renderActiveTab = Workbench.prototype.renderActiveTab;
  // Call the real code path until replaceChildren. No DOM needed after this.
  modal.scenePanel = null;
  modal.characterPanel = null;
  const originalCreate = global.document;
  global.document = undefined;
  // Prevent rendering child components; the reset itself must happen before
  // branch content is mounted and before any later async repository refresh.
  const original = Workbench.prototype.renderActiveTab;
  assert.match(original.toString(), /scrollTop\s*=\s*this\.panelRoot\.scrollLeft\s*=\s*0;[\s\S]*?replaceChildren/);
  assert.match(original.toString(), /scrollLeft\s*=\s*0/);
  try {
    // Minimal instance calls through parent reset and intentionally throws
    // later when attempting to instantiate the UI without a real browser.
    try { original.call(modal); } catch(e) { /* DOM unavailable after reset */ }
    assert.equal(panelRoot.scrollTop, 0);
    assert.equal(panelRoot.scrollLeft, 0);
    assert.equal(observedScrollDuringReplace, 0);
  } finally { global.document = originalCreate; }
});

test('inventory toolbar is fixed and only four-column card grid scrolls', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  const code = fs.readFileSync('src/presentation/CharacterCardsPanel.ts', 'utf8');
  const scene = fs.readFileSync('src/presentation/ScenePanel.ts', 'utf8');
  const roster = fs.readFileSync('src/presentation/RosterPanel.ts', 'utf8');
  // All three panels used to destroy their own flex container class. This is
  // independent of scrollTop and must never regress.
  assert.match(code, /this\.root\.className = "joa-panel-root joa-tab-panel joa-cards-tab";/);
  assert.match(scene, /this\.root\.className = "joa-panel-root joa-tab-panel joa-scene-tab";/);
  assert.match(roster, /this\.root\.className = "joa-panel-root joa-tab-panel joa-roster-tab";/);
  assert.match(css, /\.joa-panel-root\.joa-cards-tab\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;/);
  assert.match(css, /\.joa-cards-tab \.joa-character-card-grid\s*\{[^}]*flex:\s*1 1 auto;[^}]*overflow-y:\s*auto;/);
  assert.match(css, /\.joa-cards-tab \.joa-cards-toolbar\s*\{[^}]*flex:\s*0 0 auto;/);
  assert.match(css, /\.joa-panel-root\s*\{[^}]*overflow-anchor:\s*none;/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(code, /this\.root\.scrollTop = this\.grid\.scrollTop = 0;/);
});
