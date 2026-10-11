'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FixedPayloadSqliteCodec } = require('../build/infrastructure/sqlite/FixedPayloadSqliteCodec');
const { ObsidianStudioFileGateway, STUDIO_DATABASE_PATH, STUDIO_BACKUP_PATH,
  STUDIO_STAGING_PATH, STUDIO_SWAP_PATH } = require('../build/infrastructure/obsidian/ObsidianStudioFileGateway');

// Malformed storage is tested as hostile input, never a candidate for silent repair.
const codec = () => new FixedPayloadSqliteCodec();
test('rejects poisoned empty slot instead of silently accepting a blank database', () => {
  const c = codec(), db = c.createEmptyDatabase();
  db[db.length-1] = 42;
  assert.throws(() => c.readState(db), /boş veri alanında/);
});
test('rejects hidden or interrupted trailing payload bytes', () => {
  const c = codec(), db = c.createEmptyDatabase(), state = c.readState(db);
  const valid = c.writeState(db,state); valid[valid.length-1] = 66;
  assert.throws(() => c.readState(valid), /sonunda beklenmedik/);
});
test('rejects invalid state BEFORE committing to disk', () => {
  const c = codec(), db = c.createEmptyDatabase(), state = c.readState(db);
  state.mainCharacters['CHR-1'] = { id:'CHR-1',title:'',firstName:'',lastName:'',inventoryText:'',lifeStatus:'living',portraitPath:'../private' };
  assert.throws(()=>c.writeState(db,state),/portre yolu/);
  delete state.mainCharacters['CHR-1'].portraitPath;
  state.mainCharacters['CHR-1'].inventoryText='x'.repeat(24001);
  assert.throws(()=>c.writeState(db,state),/çanta verisi/);
});
test('structural fuzzing: flipped bytes and truncation never silently repair user data', () => {
  const c = codec(), valid = c.createEmptyDatabase();
  for (const size of [0,1,15,16,512,4096,65536,131071]) {
    assert.throws(()=>c.readState(valid.slice(0,size)),/SQLite/);
  }
  for (const i of [0,1,15,16,100,1024,65535,71071,71072,71095,valid.length-1]) {
    const mutant=valid.slice();mutant[i]^=0x55;
    assert.throws(()=>c.readState(mutant),/SQLite/);
  }
});
function fixture() {
  const files = new Map(), ops=[];
  let failName;
  const source=Uint8Array.of(1,2,3);
  const adapter = {
    exists:async p=>files.has(p),
    mkdir:async p=>{files.set(p,null)},
    readBinary:async p=>{ops.push('read:'+p);if(failName==='read:'+p)throw Error('injected read failure');return files.get(p)},
    writeBinary:async(p,bytes)=>{ops.push('write:'+p);if(failName==='write:'+p)throw Error('injected write failure');files.set(p,bytes)},
    rename:async(a,b)=>{ops.push('rename:'+a+'->'+b);if(failName==='rename:'+a+'->'+b)throw Error('injected rename failure');if(files.has(b))throw Error('Windows destination already exists');files.set(b,files.get(a));files.delete(a)},
    remove:async p=>{ops.push('remove:'+p);if(failName==='remove:'+p)throw Error('injected removal failure');files.delete(p)}
  };
  return {files,ops,adapter,source,fail:(name)=>{failName=name}};
}
const scenarios = [
  'read:'+STUDIO_DATABASE_PATH,
  'write:'+STUDIO_STAGING_PATH,
  'read:'+STUDIO_STAGING_PATH,
  'write:'+STUDIO_BACKUP_PATH,
  'read:'+STUDIO_BACKUP_PATH,
  'rename:'+STUDIO_DATABASE_PATH+'->'+STUDIO_SWAP_PATH,
  'rename:'+STUDIO_STAGING_PATH+'->'+STUDIO_DATABASE_PATH,
  'read:'+STUDIO_DATABASE_PATH, // also covers reading old primary before mutations
  'remove:'+STUDIO_SWAP_PATH,
];
for (const [i,scenario] of scenarios.entries()) {
  test(`fault injection ${i+1}: ${scenario} preserves a durable original or verified recovery copy`,async()=>{
    const v=fixture(),gw=new ObsidianStudioFileGateway(v.adapter);
    await gw.ensureExists(v.source);
    v.fail(scenario);
    try { await gw.write(Uint8Array.of(8,9,10)); } catch {}
    // At least one exact old snapshot survives every injected failure.
    const old = [STUDIO_DATABASE_PATH,STUDIO_BACKUP_PATH,STUDIO_SWAP_PATH].some(p =>
      v.files.has(p) && JSON.stringify(Array.from(new Uint8Array(v.files.get(p)))) === '[1,2,3]');
    assert.ok(old,'original bytes must remain recoverable: '+JSON.stringify(v.ops));
    // A failed write never fabricates an empty replacement.
    const current=v.files.get(STUDIO_DATABASE_PATH);
    if(current)assert.ok(current.byteLength>0);
  });
}
