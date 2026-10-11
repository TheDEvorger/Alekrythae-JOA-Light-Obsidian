"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const finalCss = fs.readFileSync("styles/15-frame-alignment-and-controls.css", "utf8");

test("no permanent main scrollbar gap; equal horizontal panel insets", () => {
  assert.match(finalCss, /scrollbar-gutter:\s*auto\s*!important/);
  assert.match(finalCss, /padding-inline:\s*var\(--joa-even-side-inset\)\s*!important/);
  assert.match(finalCss, /\.joa-cards-tab \.joa-character-card-grid\s*\{[^}]*padding-left:\s*2px;[^}]*padding-right:\s*2px;/);
});
test("all three scene diamonds share the same 50% CSS axis", () => {
  assert.match(finalCss, /\.joa-studio-tabs::after,\s*\.joa-studio-modal :is\(\.joa-scene-compact-row, \.joa-writing-paper\)::before\s*\{[^}]*left:\s*50%\s*!important;[^}]*translateX\(-50%\)/);
});
test("navigation and add button ornaments are owned by their transforming buttons", () => {
  assert.match(finalCss, /\.joa-tab-button, \.joa-visual-button, \.joa-visual-select/);
  assert.match(finalCss, /\.joa-scene-add-main, \.joa-scene-confirm/);
  assert.match(finalCss, /background-image:\s*var\(--joa-corner-tl\), var\(--joa-corner-tr\)/);
  assert.match(finalCss, /pointer-events:\s*none;/);
  assert.match(finalCss, /\.joa-tab-button::after\s*\{/);
});
test("roster dropdown puts Place before Other, rather than hiding it last", () => {
  const source = fs.readFileSync("src/presentation/RosterAddForm.ts", "utf8");
  const entries = Array.from(source.matchAll(/\["(npc|vehicle|place|other)",\s*`/g), x => x[1]);
  assert.deepEqual(entries, ["npc", "vehicle", "place", "other"]);
});
