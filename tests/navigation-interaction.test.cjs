const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('styles/01-workbench-shell.css', 'utf8');

test('navigation exposes a restrained gold hover only on capable pointers', () => {
  assert.match(css, /--joa-nav-gold:\s*#[a-f\d]{6}/i);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /\.joa-tab-button:hover\s*\{[^}]*border-color:[^}]*background-color:[^}]*box-shadow:/s);
  assert.match(css, /\.joa-tab-button\.is-active:hover\s*\{/);
});

test('keyboard focus and reduced-motion preferences are respected', () => {
  assert.match(css, /\.joa-tab-button:focus-visible\s*\{[^}]*outline:/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.joa-tab-button\s*\{\s*transition: none;/s);
});

test('hover gently raises the button using composited transform only', () => {
  const hovered = css.match(/\.joa-tab-button:hover\s*\{([^}]*)\}/s)?.[1];
  assert.ok(hovered, 'hover block exists');
  assert.match(hovered, /transform:\s*translateY\(-2px\)/);
  assert.doesNotMatch(hovered, /\b(width|height|padding|margin|font-size|scale)\s*:/);
  assert.match(css, /transition:[^;]*transform 160ms ease/s);
  assert.match(css, /prefers-reduced-motion: reduce[^}]*}\s*\.joa-tab-button:hover\s*\{\s*transform:\s*none/s);
});
