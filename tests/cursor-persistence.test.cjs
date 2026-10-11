const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const originalLoad = Module._load;
let CursorSession;
try {
  Module._load = function(request, parent, isMain) {
    if (request === 'obsidian') return { MarkdownView: class MarkdownView {} };
    return originalLoad.call(this, request, parent, isMain);
  };
  ({ ObsidianCursorSession: CursorSession } = require(path.resolve('build/infrastructure/obsidian/ObsidianCursorSession.js')));
} finally { Module._load = originalLoad; }

function setup(initial = {}, initialPath = 'chapters/a.md') {
  let path = initialPath, payload = structuredClone(initial);
  const callbacks = new Map();
  const view = {editor: fakeEditor({line: 0, ch: 0})};
  const workspace = {
    on(name, cb) { callbacks.set(name, cb); return {}; },
    onLayoutReady(cb) { cb(); },
    getActiveFile() { return path ? {path} : null; },
    getActiveViewOfType() { return view; }
  };
  const plugin = {
    async loadData() { return structuredClone(payload); },
    async saveData(data) { payload = structuredClone(data); },
    registerEvent() {}
  };
  const app = {workspace};
  const session = new CursorSession(plugin,app);
  return {session, view, callbacks, get payload(){return payload;}, setFile(p,e) { path=p; view.editor=e; callbacks.get('file-open')?.({path:p}); }};
}

function fakeEditor(position, lines=['one', 'two', 'three', 'four']) {
  const editor = {
    position: {...position}, focusCalls: 0, scrolls: [],
    getCursor() {return {...this.position};},
    setCursor(p) {this.position={...p};},
    lastLine() {return lines.length-1;},
    getLine(i) {return lines[i];},
    focus() {this.focusCalls++;},
    scrollIntoView(r){this.scrolls.push(r);}
  };
  return editor;
}
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));

test('F3 close keeps cursor at the next insertion instead of resetting to line zero',async () => {
  const env=setup({},'chapters/a.md');
  await env.session.start();
  const editor=env.view.editor;
  editor.setCursor({line:2,ch:3});
  const start=env.session.beginWorkbench(editor,'chapters/a.md');
  assert.deepEqual(start,{line:2,ch:3});
  // Inserting a multiline conversation advances the recorded caret.
  env.session.sceneInserted('chapters/a.md',{line:3,ch:1});
  editor.setCursor({line:0,ch:0});
  env.session.endWorkbench(editor,'chapters/a.md',{line:3,ch:1});
  assert.deepEqual(editor.getCursor(),{line:3,ch:1});
  assert.equal(editor.focusCalls,1);
  await env.session.dispose();
  assert.deepEqual(env.payload.joaCursorPositions['chapters/a.md'],{line:3,ch:1});
});

test('different Markdown files preserve their own cursor across app restart',async () => {
  const first=setup({customSetting:'preserved'});
  await first.session.start();
  first.view.editor.setCursor({line:1,ch:2});
  first.session.captureActive();
  const other=fakeEditor({line:2,ch:4},['zero','one','long enough']);
  first.setFile('chapters/b.md',other);
  first.session.captureActive();
  await first.session.dispose();
  assert.deepEqual(first.payload.joaCursorPositions['chapters/a.md'],{line:1,ch:2});
  assert.deepEqual(first.payload.joaCursorPositions['chapters/b.md'],{line:2,ch:4});
  assert.equal(first.payload.customSetting,'preserved');
  const second=setup(first.payload,'chapters/a.md');
  await second.session.start();
  await wait(160);
  assert.deepEqual(second.view.editor.getCursor(),{line:1,ch:2});
  second.setFile('chapters/b.md',fakeEditor({line:0,ch:0},['zero','one','long enough']));
  await wait(160);
  assert.deepEqual(second.view.editor.getCursor(),{line:2,ch:4});
  await second.session.dispose();
});

test('old cursor positions are clamped if a note has been shortened',async () => {
  const env=setup({joaCursorPositions:{'chapters/a.md':{line:999,ch:999}}});
  await env.session.start();
  await wait(160);
  assert.deepEqual(env.view.editor.getCursor(),{line:3,ch:4});
  await env.session.dispose();
});

test('F3 opening before delayed note restore uses last saved cursor',async () => {
  const env=setup({joaCursorPositions:{'chapters/a.md':{line:2,ch:2}}});
  await env.session.start();
  const p=env.session.beginWorkbench(env.view.editor,'chapters/a.md');
  assert.deepEqual(p,{line:2,ch:2});
  env.session.endWorkbench(env.view.editor,'chapters/a.md',p);
  await env.session.dispose();
});
