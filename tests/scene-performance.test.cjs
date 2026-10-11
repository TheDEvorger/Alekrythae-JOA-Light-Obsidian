const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('runtime includes portrait rendering but no large scene art decoding pipeline',()=>{
  const main=fs.readFileSync('src/main.ts','utf8');
  const renderer=fs.readFileSync('src/infrastructure/obsidian/LiveCalloutArtRenderer.ts','utf8');
  const scene=fs.readFileSync('src/presentation/ScenePanel.ts','utf8');
  assert.match(renderer,/updatePortrait/u);
  assert.doesNotMatch(renderer,/getSceneImageUrl|getSceneImageDataUrl|updateSceneArt/u);
  assert.doesNotMatch(main,/SceneArtStore|CanvasSceneImageOptimizer|sceneImages/u);
  assert.doesNotMatch(scene,/saveSceneImage|arrayBuffer\(\)|createObjectURL/u);
  assert.ok(fs.existsSync('src/infrastructure/obsidian/ObsidianPortraitStore.ts'));
});
