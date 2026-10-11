"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { FANTASY_THEMES, selectTheme } = require("../build/domain/appearance/ThemeCatalog.js");
const { parseAppearance, DEFAULT_APPEARANCE } = require("../build/domain/appearance/AppearanceSettings.js");

test("24 named canonical themes have distinct color and ornament identities", () => {
  assert.equal(FANTASY_THEMES.length, 24);
  assert.equal(new Set(FANTASY_THEMES.map(t => t.id)).size, 24);
  assert.equal(new Set(FANTASY_THEMES.map(t => t.name)).size, 24);
  assert.equal(new Set(FANTASY_THEMES.map(t => [t.bg,t.panel,t.gold,t.line,t.glow,t.radius,t.surface,t.ornament].join(";"))).size, 24);
  assert.equal(selectTheme("missing").id, "moon-citadel");
});

test("visual settings constrain paths and non-finite sliders", () => {
  assert.deepEqual(parseAppearance(null), DEFAULT_APPEARANCE);
  const unsafe = parseAppearance({ themeId: "moon-citadel", imagePath: "../../outside.webp", blur: Infinity, fit: "stretch", darkness: -100 });
  assert.equal(unsafe.imagePath, DEFAULT_APPEARANCE.imagePath);
  assert.equal(unsafe.blur, 0);
  assert.equal(unsafe.fit, "cover");
  assert.equal(unsafe.darkness, 15);
  assert.equal(parseAppearance({ blur: 150, fit: "height" }).blur, 24);
});

test("D240 canonical audio contains exactly MV1..MV240 MP3 assets", () => {
  const names = fs.readdirSync("audio").filter(name => name.endsWith(".mp3")).sort();
  const expected = Array.from({length:240}, (_,i) => `MV${i+1}.mp3`).sort();
  assert.deepEqual(names, expected);
  for (const name of names) {
    const bytes = fs.readFileSync(`audio/${name}`);
    assert.ok(bytes.length >= 128 && bytes.length <= 3_000_000, `${name} size`);
    assert.equal(bytes.subarray(0,3).toString("ascii"), "ID3", `${name} signature`);
  }
});

test("compact scene remains multiline, and Meggy audio only starts after insertion and closing F3", () => {
  const modal = fs.readFileSync("src/presentation/MeggySceneModal.ts", "utf8");
  const scene = fs.readFileSync("src/presentation/ScenePanel.ts", "utf8");
  assert.match(scene, /joa-scene-compact-row/);
  assert.match(scene, /textarea\.rows = 11/);
  assert.doesNotMatch(scene, /Meggy konuşuyor|SAHNE YAZARI/);
  const insertion = modal.indexOf("this.insertion.insert(markdown)");
  const close = modal.indexOf("this.close(); // Restore");
  const play = modal.indexOf("this.meggyAudio?.playD240(d240Roll)");
  assert.ok(insertion > 0 && close > insertion && play > close);
  assert.match(modal, /if \(d240Roll !== undefined\)/);
});

test("every canonical D240 number maps to its exact supplied voice and checksum", () => {
  const fixture = JSON.parse(fs.readFileSync("tests/fixtures/mv-lines.original.json","utf8"));
  const recorded = new Map(fs.readFileSync("audio/SHA256SUMS.txt","utf8").trim().split("\n").map(line => {
    const [hash,name]=line.split(/\s+/); return [name,hash];
  }));
  assert.equal(recorded.size,240);
  for(let n=1;n<=240;n++) {
    const name=`MV${n}.mp3`;
    assert.equal(fixture[n].audio, `Assets/mv-voice/${name}`);
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(`audio/${name}`)).digest("hex"),recorded.get(name));
  }
});

test("visual settings persist through the same queue as caret positions", async () => {
  const { AppearancePreferences } = require("../build/application/settings/AppearancePreferences.js");
  let state = { joaCursorPositions: { "note.md": {line:2,ch:3} } };
  const store = { read: async () => state, update: async(fn) => { state = fn(state); } };
  const preferences = new AppearancePreferences(store);
  await preferences.save({ ...DEFAULT_APPEARANCE, blur: 7 });
  assert.deepEqual(state.joaCursorPositions, { "note.md": {line:2,ch:3} });
  assert.equal((await preferences.load()).blur, 7);
});
