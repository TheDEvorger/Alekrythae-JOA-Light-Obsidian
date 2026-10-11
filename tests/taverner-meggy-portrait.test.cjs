const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ObsidianMeggyPortrait, TAVERNER_MEGGY_PATH } = require('../build/infrastructure/obsidian/ObsidianMeggyPortrait.js');
const { MEGGY_PORTRAIT_DATA_URL } = require('../build/assets/CanonicalMeggyPortrait.js');

test('Meggy is loaded from the exact user-provided Taverner Meggy.webp filename', async () => {
  assert.equal(TAVERNER_MEGGY_PATH, '.obsidian/plugins/joa-frp-writer/Taverner Meggy.webp');
  const file = Uint8Array.from([82,73,70,70,12,0,0,0,87,69,66,80,86,80,56,32]);
  const paths = [];
  const loader = new ObsidianMeggyPortrait({
    exists: async path => { paths.push(path); return true; },
    stat: async () => ({size:file.byteLength}),
    readBinary: async path => { paths.push(path); return file.buffer; }
  });
  assert.equal(await loader.getDataUrl(), `data:image/webp;base64,${Buffer.from(file).toString('base64')}`);
  assert.deepEqual(paths,[TAVERNER_MEGGY_PATH,TAVERNER_MEGGY_PATH]);
  assert.equal(await loader.getDataUrl(), `data:image/webp;base64,${Buffer.from(file).toString('base64')}`);
  assert.deepEqual(paths,[TAVERNER_MEGGY_PATH,TAVERNER_MEGGY_PATH],'cached portrait is not reread on every repaint');
});

test('missing, invalid or oversized user portrait safely falls back to embedded canonical art',async()=>{
  const absent = new ObsidianMeggyPortrait({exists:async()=>false,readBinary:async()=>{throw Error('unexpected');}});
  assert.equal(await absent.getDataUrl(), MEGGY_PORTRAIT_DATA_URL);
  const invalid = new ObsidianMeggyPortrait({exists:async()=>true,stat:async()=>({size:12}),readBinary:async()=>new Uint8Array(12).buffer});
  assert.equal(await invalid.getDataUrl(), MEGGY_PORTRAIT_DATA_URL);
  const oversize = new ObsidianMeggyPortrait({exists:async()=>true,stat:async()=>({size:9*1024*1024}),readBinary:async()=>{throw Error('should not read');}});
  assert.equal(await oversize.getDataUrl(), MEGGY_PORTRAIT_DATA_URL);
});

test('the same canonical Meggy source is wired to all three visible portrait surfaces',()=>{
  const entry = fs.readFileSync('src/main.ts','utf8');
  const header = fs.readFileSync('src/presentation/StudioTabBar.ts','utf8');
  const picker = fs.readFileSync('src/presentation/SceneSpeakerPicker.ts','utf8');
  const callout = fs.readFileSync('src/infrastructure/obsidian/LiveCalloutArtRenderer.ts','utf8');
  assert.match(entry,/new ObsidianMeggyPortrait\(this\.app\.vault\.adapter\)/);
  assert.match(header,/this\.meggyPortrait\?\.getDataUrl\(\)/);
  assert.match(picker,/this\.actions\.meggyPortrait\?\.\(\)/);
  assert.match(callout,/this\.meggyPortrait\?\.getDataUrl\(\)/);
  assert.doesNotMatch(entry,/meggy-avatar\.webp/);
});
