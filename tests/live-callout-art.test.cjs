const test = require('node:test');
const assert = require('node:assert/strict');
const { LiveCalloutArtRenderer } = require('../build/infrastructure/obsidian/LiveCalloutArtRenderer.js');
const { MEGGY_PORTRAIT_DATA_URL } = require('../build/presentation/EmbeddedMeggyPortrait.js');

function makeRenderedCallout({type='joa-main-speech', metadata='', name='Alek ⟡ Mor', prefix=''}) {
  const portraitChildren=[];
  const contentChildren=[{tagName:'P',textContent:'Buradayım.'}];
  const titleInner={textContent:`${prefix}${name}`};
  const title={firstChild: null, querySelector(sel){return sel==='.joa-live-portrait'?portraitChildren[0]:null;}, insertBefore(el){portraitChildren.unshift(el);}};
  const content={firstChild:contentChildren[0], querySelector(sel){return sel==='.joa-scene-illustration'?contentChildren.find(x=>x.className==='joa-scene-illustration'):null;},insertBefore(el){contentChildren.unshift(el);}};
  const classes = new Set();
  const callout={
    isConnected: true, dataset: {callout:type},
    getAttribute(k){return k==='data-callout-metadata'?metadata:null;},
    querySelector(q){if(q==='.callout-title')return title; if(q==='.callout-content')return content;
      if(q==='.callout-title-inner')return titleInner; return null;},
    classList:{add(x){classes.add(x);},remove(x){classes.delete(x);}}
  };
  const root = {matches(){return false;},querySelectorAll(){return [callout];}};
  return {root,callout,title,titleInner,content,portraitChildren,contentChildren,classes};
}

test('identity-linked dialogue updates portrait when artwork changes',async()=>{
  global.document={createElement:()=>({className:'',src:'',isConnected:true})};
  const states=new Map([['CHR-1','data:image/webp;base64,OLD']]);
  const speaker={id:'CHR-1',name:'Alek ⟡ Mor',kind:'main',portraitPath:'art/CHR-1.webp'};
  const renderer = new LiveCalloutArtRenderer(
    {listSpeakers:async()=>[speaker]},
    {getDataUrl:async()=>states.get('CHR-1')}
  );
  const oldNote=makeRenderedCallout({metadata:'joa-speaker-CHR-1',name:'Alek ⟡ Mor'});
  const recentNote=makeRenderedCallout({metadata:'joa-speaker-CHR-1',name:'Alek ⟡ Mor'});
  await renderer.hydrate(oldNote.root);
  await renderer.hydrate(recentNote.root);
  assert.equal(oldNote.portraitChildren[0].src,'data:image/webp;base64,OLD');
  assert.equal(recentNote.portraitChildren[0].src,'data:image/webp;base64,OLD');
  states.set('CHR-1','data:image/webp;base64,NEW');
  renderer.refresh(); // emitted after the stored portrait is replaced
  await renderer.hydrate(oldNote.root);
  await renderer.hydrate(recentNote.root);
  assert.equal(oldNote.portraitChildren[0].src,'data:image/webp;base64,NEW');
  assert.equal(recentNote.portraitChildren[0].src,'data:image/webp;base64,NEW');
  assert.equal(oldNote.portraitChildren.length,1,'no duplicate portrait nodes');
});

test('a dialogue title without an ID resolves a unique speaker by name', async () => {
  global.document={createElement:()=>({className:'',src:'',isConnected:true})};
  const renderer=new LiveCalloutArtRenderer(
    {listSpeakers:async()=>[{id:'ENT-6',name:'Lira ⟡ Kuzey',kind:'npc',portraitPath:'art/lira.webp'}]},
    {getDataUrl:async path=>path==='art/lira.webp'?'data:image/webp;base64,NPC':undefined}
  );
  const note=makeRenderedCallout({type:'joa-npc-speech',name:'Lira ⟡ Kuzey'});
  await renderer.hydrate(note.root);
  assert.equal(note.portraitChildren[0].src,'data:image/webp;base64,NPC');
  assert.equal(note.titleInner.textContent,'Lira ⟡ Kuzey');
  await renderer.hydrate(note.root);
  assert.equal(note.portraitChildren.length,1);
});

test('Meggy dialogue always renders the immutable canonical image', async()=>{
  global.document={createElement:()=>({className:'',src:'',isConnected:true})};
  const requested=[];
  const renderer=new LiveCalloutArtRenderer(
    {listSpeakers:async()=>[]},
    {getDataUrl:async path=>{requested.push(path);return 'data:image/webp;base64,OVERRIDE';}}
  );
  const note=makeRenderedCallout({type:'joa-dialogue',metadata:'joa-speaker-meggy',name:'Meggy'});
  await renderer.hydrate(note.root);
  assert.equal(note.portraitChildren[0].src,MEGGY_PORTRAIT_DATA_URL);
  renderer.refresh();
  await renderer.hydrate(note.root);
  assert.equal(note.portraitChildren[0].src,MEGGY_PORTRAIT_DATA_URL);
  assert.deepEqual(requested,[],'canonical Meggy image must not load from user art');
});

test('dialogue text and speaker name remain unchanged after art hydration', async () => {
  global.document={createElement:()=>({className:'',src:'',isConnected:true})};
  const note=makeRenderedCallout({metadata:'joa-speaker-CHR-1',name:'Alek ⟡ Mor'});
  const renderer=new LiveCalloutArtRenderer(
    {listSpeakers:async()=>[{id:'CHR-1',name:'Alek ⟡ Mor',kind:'main'}]},
    {getDataUrl:async()=>undefined}
  );
  await renderer.hydrate(note.root);
  assert.equal(note.titleInner.textContent,'Alek ⟡ Mor');
  assert.equal(note.contentChildren[0].textContent,'Buradayım.');
});
