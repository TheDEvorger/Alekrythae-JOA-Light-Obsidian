const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {CalloutStyleTable}=require('../build/domain/callout/CalloutStyleTable.js');
test('all twenty-four event types are stable, independent from D240, unique and styled',()=>{
 const entries=new CalloutStyleTable().allEntries();
 assert.equal(entries.length,24);
 assert.equal(new Set(entries.map(x=>x.type)).size,24);
 assert.equal(new Set(entries.map(x=>x.label)).size,24);
 const css=fs.readFileSync('styles.css','utf8');
 for(const x of entries) assert.ok(css.includes(`[data-callout="${x.type}"]`),x.type);
});
