const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Only the catalog owns which emojis are lawful; no second whitelist.
const { APPROVED_FANTASY_EMOJI } = require('../build/domain/shared/FantasyEmojiCatalog.js');
const allowed = new Set(APPROVED_FANTASY_EMOJI);
const segmenter = new Intl.Segmenter('tr', {granularity: 'grapheme'});

function sourceFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : entry.name.endsWith('.ts') ? [full] : [];
  });
}

function cssFiles(dir) {
  return fs.readdirSync(dir).filter(name => name.endsWith('.css')).map(name => path.join(dir, name));
}

function audit(file) {
  const source = fs.readFileSync(file, 'utf8');
  for (const { segment } of segmenter.segment(source)) {
    if (!/\p{Extended_Pictographic}/u.test(segment)) continue;
    assert.ok(allowed.has(segment), `FRP dışı veya silüet emoji: ${file} -> ${segment}`);
  }
  for (const shape of [0x25a1,0x25a0,0x25aa,0x25ab,0x2b1b,0x2b1c,0x1f532,0x1f533,0x25fb,0x25fc,0x25a3,0x274f,0xfffd].map(cp => String.fromCodePoint(cp))) {
    assert.ok(!source.includes(shape), `Kare / bozuk işaret: ${file}`);
  }
  assert.doesNotMatch(source, /lucide-(?:message-square|square|user|users|monitor|laptop)\b/u);
}

test('every UI element and rendered note uses the approved fantasy-object emoji palette', () => {
  for (const file of [...sourceFiles('src'), ...cssFiles('styles'), 'styles.css', 'release/joa-frp-writer/main.js', 'release/joa-frp-writer/styles.css']) audit(file);
});

test('no human silhouettes or hollow-square placeholders; canonical ⟡ remains', () => {
  const bundle = fs.readFileSync('release/joa-frp-writer/main.js', 'utf8');
  const main = fs.readFileSync('src/domain/studio/StudioModels.ts', 'utf8');
  assert.match(main, /NAME_SEPARATOR = "⟡"/u);
  assert.match(bundle, /⟡/u);
  assert.doesNotMatch(fs.readFileSync('src/domain/writing/SceneCalloutFormatter.ts', 'utf8'), /FANTASY_EMOJI\.speech/u);
  assert.doesNotMatch(fs.readFileSync('src/infrastructure/obsidian/LiveCalloutArtRenderer.ts', 'utf8'), /String\.fromCodePoint\(0x1f4ac\)/u);
  assert.match(fs.readFileSync('styles.css', 'utf8'), /lucide-scroll/u);
});


test('catalog contains only unique old-world fantasy objects and nature icons', () => {
  assert.equal(allowed.size, APPROVED_FANTASY_EMOJI.length);
  assert.equal(allowed.size, 23);
  for (const icon of APPROVED_FANTASY_EMOJI) {
    assert.ok(/\p{Extended_Pictographic}/u.test(icon), `Not an emoji: ${icon}`);
    assert.ok(!/[\u200d\u2640\u2642\ud83c][\udffb-\udfff]/u.test(icon));
  }
});

test('portrait, NPC, exit and resurrection avoid mundane UI pictographs', () => {
  const src = sourceFiles('src').map(file => fs.readFileSync(file, 'utf8')).join('\n');
  for (const codepoint of [0x1f3ad,0x1f58c,0x1f6aa,0x1f305,0x1f9dd,0x1f9db,0x1f9dc,0x1faa6]) {
    assert.ok(!src.includes(String.fromCodePoint(codepoint)), `Yasaklı ikon: U+${codepoint.toString(16)}`);
  }
  assert.equal(require('../build/domain/shared/FantasyEmojiCatalog.js').FANTASY_EMOJI.roster, '🗺️');
  assert.match(fs.readFileSync('src/presentation/RosterAddForm.ts', 'utf8'), /FANTASY_EMOJI\.npc/u);
  assert.match(fs.readFileSync('src/domain/callout/CalloutStyleTable.ts', 'utf8'), /FANTASY_EMOJI\.forest/u);
});
