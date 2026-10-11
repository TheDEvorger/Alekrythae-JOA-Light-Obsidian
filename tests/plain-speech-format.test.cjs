const test=require('node:test');
const assert=require('node:assert/strict');
const { displayName }=require('../build/domain/studio/StudioModels.js');
const {SceneCalloutFormatter}=require('../build/domain/writing/SceneCalloutFormatter.js');
const {SceneEditorInsertion}=require('../build/presentation/SceneEditorInsertion.js');

test('all title, first name and last name combinations use exactly the requested separators',()=>{
  assert.equal(displayName({title:'Kaptan',firstName:'Arven',lastName:'Korda'}),'Kaptan - Arven ⟡ Korda');
  assert.equal(displayName({title:'Kaptan',firstName:'Arven',lastName:''}),'Kaptan - Arven');
  assert.equal(displayName({title:'',firstName:'Arven',lastName:'Korda'}),'Arven ⟡ Korda');
  assert.equal(displayName({title:'',firstName:'Arven',lastName:''}),'Arven');
  assert.equal(displayName({title:'Usta',firstName:'',lastName:'Korda'}),'Usta - Korda');
});

test('plain speech has no quote callouts, and multiline content keeps newlines',()=>{
  const writer=new SceneCalloutFormatter();
  const content=writer.dialogue('Kaptan - Arven ⟡ Korda','Merhaba.\nHoş geldin.','npc','ENT-1');
  assert.equal(content,'Kaptan - Arven ⟡ Korda: Merhaba.\nHoş geldin.');
  assert.doesNotMatch(content,/^> |\[!joa-/m);
});

test('colon follows the full visible speaker identity, not the title or given name', () => {
  const formatter = new SceneCalloutFormatter();
  for (const name of ['Kaptan - Arven ⟡ Korda', 'Kaptan - Arven', 'Arven ⟡ Korda', 'Arven', 'Meggy']) {
    assert.equal(formatter.dialogue(name, 'Selam.'), `${name}: Selam.`);
  }
});

test('every confirmation advances the cursor with one empty line between entries',()=>{
  let doc='Önceki paragraf'; let moved, lastSaved;
  const editor={
    replaceRange(text,from){
      const lines=doc.split('\n');
      const before=lines.slice(0,from.line).join('\n');
      const after=lines.slice(from.line+1).join('\n');
      const line=lines[from.line]||'';
      doc=(from.line?before+'\n':'')+line.slice(0,from.ch)+text+line.slice(from.ch)+(from.line<lines.length-1?'\n'+after:'');
    },
    setCursor(point){moved=point;}
  };
  const insertion=new SceneEditorInsertion(editor,{line:0,ch:doc.length},(point)=>{lastSaved=point;});
  insertion.insert('Meggy: İlk söz.');
  assert.ok(doc.startsWith('Önceki paragraf\n\nMeggy: İlk söz.\n\n'));
  assert.equal(moved.ch,0);
  assert.deepEqual(moved,lastSaved);
  insertion.insert('Kaptan - Arven ⟡ Korda: İkinci söz.');
  assert.ok(doc.endsWith('İlk söz.\n\nKaptan - Arven ⟡ Korda: İkinci söz.\n\n'));
  assert.equal(moved.ch,0);
  assert.deepEqual(moved,lastSaved);
});

test('visible speaker and first dialogue sentence share one line without Markdown heading',()=>{
  const fmt = new SceneCalloutFormatter();
  assert.equal(fmt.dialogue('Kaptan - Arven ⟡ Korda','Merhaba, yolculuğa hazır mısın?'),
    'Kaptan - Arven ⟡ Korda: Merhaba, yolculuğa hazır mısın?');
  for (const speaker of ['Kaptan - Arven','Arven ⟡ Korda','Arven','Meggy']) {
    assert.equal(fmt.dialogue(speaker, 'Merhaba.'), `${speaker}: Merhaba.`);
  }
});
