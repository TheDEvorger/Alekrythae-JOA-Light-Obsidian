const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { StudioFullscreenSession } = require('../build/presentation/StudioFullscreenSession.js');

test('non-Meggy stays in workbench; Meggy insertion closes before audio playback', () => {
  const source = fs.readFileSync('src/presentation/MeggySceneModal.ts','utf8');
  assert.match(source, /this\.insertion\.insert\(markdown\)/u);
  assert.match(source, /this\.sceneDraft = "";/u);
  assert.match(source, /if \(d240Roll !== undefined\)/u);
  assert.match(source, /this\.close\(\); \/\/ Restore the Markdown editor before speaking/u);
  assert.match(source, /void this\.meggyAudio\?\.playD240\(d240Roll\)/u);
  assert.doesNotMatch(source, /this\.insertion\.insert\(markdown\);\s*this\.close\(\)/u);
  assert.match(fs.readFileSync("src/presentation/SceneEditorInsertion.ts", "utf8"), /this\.position = this\.advance\(this\.position, insertion\)/u);
});

test('native fullscreen session restores prior window mode', async () => {
  let full = false, dismisses = 0;
  const events = new Map();
  const native = {
    isFullScreen: () => full,
    setFullScreen: (value) => { full = value; },
    on: (name, callback) => events.set(name,callback),
    removeListener: (name) => events.delete(name)
  };
  const doc = { defaultView: { require: () => ({ getCurrentWindow: () => native }) }, removeEventListener() {} };
  const session = new StudioFullscreenSession(doc, () => dismisses++);
  await session.enter();
  assert.equal(full, true);
  assert.ok(events.has('leave-full-screen'));
  session.exit();
  assert.equal(full, false);
  assert.equal(dismisses, 0);
  assert.equal(events.size, 0);
});

test('already fullscreen window is not changed on exit', async () => {
  let writes=0;
  const win = {isFullScreen:()=>true,setFullScreen:()=>writes++};
  const session = new StudioFullscreenSession({defaultView:{require:()=>({getCurrentWindow:()=>win})},removeEventListener(){}},()=>{});
  await session.enter(); session.exit();
  assert.equal(writes,0);
});

test('HTML fullscreen fallback exits when workbench closes', async () => {
  const listeners = new Map();
  let exits=0, dismisses=0;
  const doc = { defaultView: {}, fullscreenElement:null,
    documentElement: {requestFullscreen: async () => {doc.fullscreenElement=doc.documentElement;}},
    addEventListener: (name,cb) => listeners.set(name,cb),
    removeEventListener: (name) => listeners.delete(name),
    exitFullscreen: async () => {doc.fullscreenElement=null; exits++;}
  };
  const session = new StudioFullscreenSession(doc,()=>dismisses++);
  await session.enter();
  assert.equal(doc.fullscreenElement,doc.documentElement);
  assert.ok(listeners.has('fullscreenchange'));
  session.exit();
  await Promise.resolve();
  assert.equal(exits,1);
  assert.equal(dismisses,0);
  assert.equal(listeners.size,0);
});

test('HTML fullscreen user exit triggers the modal-close callback', async () => {
  const listeners = new Map();
  let dismissed=0;
  const doc = {defaultView:{},fullscreenElement:null,
    documentElement:{requestFullscreen: async ()=>{doc.fullscreenElement=doc.documentElement;}},
    addEventListener:(name,cb)=>listeners.set(name,cb),
    removeEventListener:(name)=>listeners.delete(name),
    exitFullscreen:async()=>{doc.fullscreenElement=null;}
  };
  const session = new StudioFullscreenSession(doc,()=>dismissed++);
  await session.enter(); doc.fullscreenElement=null;
  listeners.get('fullscreenchange')();
  assert.equal(dismissed,1);
  session.exit();
});
