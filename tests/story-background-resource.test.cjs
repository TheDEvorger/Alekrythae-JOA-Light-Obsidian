const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ObsidianBackgroundImages } = require('../build/infrastructure/obsidian/ObsidianBackgroundImages.js');

const STORY = '.obsidian/plugins/joa-frp-writer/assets/anlati-panel.png';
const MAIN = '.obsidian/plugins/joa-frp-writer/background-images/default.webp';

function toArrayBuffer(data) {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

test('illustration is loaded from plugin directory as an independently owned blob URL', async () => {
  const story = fs.readFileSync('assets/anlati-panel.png');
  const main = fs.readFileSync('background-images/default.webp');
  const files = new Map([[STORY, story], [MAIN, main]]);
  const seen = [];
  const adapter = {
    exists: async p => { seen.push(p); return files.has(p); },
    stat: async p => ({ size: files.get(p).byteLength }),
    readBinary: async p => toArrayBuffer(files.get(p))
  };
  const loader = new ObsidianBackgroundImages(adapter);
  const storyUrl = await loader.storyResource();
  assert.match(storyUrl, /^blob:/u);
  assert.deepEqual(Buffer.from(await (await fetch(storyUrl)).arrayBuffer()), story);
  const mainUrl = await loader.resource(MAIN);
  assert.match(mainUrl, /^blob:/u);
  assert.deepEqual(Buffer.from(await (await fetch(storyUrl)).arrayBuffer()), story,
    'main image refresh must not revoke narrative image');
  assert.ok(seen.includes(STORY));
  loader.release();
  await assert.rejects(() => fetch(storyUrl));
});

test('only a valid packaged PNG can become the narrative background', async () => {
  const fake = new ObsidianBackgroundImages({
    exists: async () => true,
    stat: async () => ({ size: 48 }),
    readBinary: async () => toArrayBuffer(Buffer.alloc(48))
  });
  assert.equal(await fake.storyResource(), undefined);
  fake.release();
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(css, /background-image:\s*var\(--joa-story-image, none\)/u);
  assert.doesNotMatch(css, /background-image:\s*url\("assets\/anlati-panel\.png"\)/u);
  const controls = fs.readFileSync('src/presentation/appearance/StudioVisualControls.ts', 'utf8');
  assert.match(controls, /this\.images\.storyResource\(\)/u);
  assert.match(controls, /setProperty\("--joa-story-image"/u);
});
