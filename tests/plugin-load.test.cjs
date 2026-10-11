const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

// A small Obsidian desktop shim: checks real release bundle onload and DB operations.
test('bundled plugin loads, registers F3 and saves renamed cards to persistent SQLite bytes', async () => {
  const contents = new Map();
  const adapter = {
    async exists(p) { return contents.has(p); },
    async mkdir(p) { contents.set(p, null); },
    async readBinary(p) { return contents.get(p); },
    async writeBinary(p, bytes) { contents.set(p, bytes); },
    async rename(src,dst) { contents.set(dst,contents.get(src)); contents.delete(src); },
    async remove(p) { contents.delete(p); }
  };
  class FakePlugin {
    constructor() { this.app = { vault: { adapter }, workspace: {} }; this.commands = []; }
    addCommand(command) { this.commands.push(command); }
  }
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'obsidian') return { Plugin: FakePlugin, Modal: class {}, Notice: class {} };
    return originalLoad.call(this, request, parent, isMain);
  };
  let PluginClass;
  try {
    PluginClass = require(path.resolve('release/joa-frp-writer/main.js'));
  } finally {
    Module._load = originalLoad;
  }

  const plugin = new PluginClass();
  await plugin.onload();
  assert.deepEqual(plugin.commands.find(c => c.id === 'open-meggy-scene-writer').hotkeys, [{ modifiers: [], key: 'F3' }]);
  assert.ok(plugin.commands.some(c => c.id === 'replay-last-meggy-voice')); 
  const dbPath = '.obsidian/plugins/joa-frp-writer/sqlite/inventory.sqlite';
  const db = contents.get(dbPath);
  assert.equal(new TextDecoder().decode(new Uint8Array(db).slice(0, 16)), 'SQLite format 3\0');

  const card = await plugin.studio.createMainCharacter();
  assert.equal(card.firstName, '');
  assert.equal(card.lastName, '');
  await plugin.studio.updateMainCharacter(card.id, {
    firstName: 'Mæ’Dáryŋ', lastName: 'Æþ’Mør', inventoryText: 'Kılıç\n10 gümüş'
  });
  const [persisted] = await plugin.studio.listMainCharacters();
  assert.equal(persisted.firstName, 'Mæ’Dáryŋ');
  assert.equal(persisted.lastName, 'Æþ’Mør');
  assert.equal(persisted.inventoryText, 'Kılıç\n10 gümüş');
  const list = await plugin.studio.listRoster('living');
  assert.equal(list[0].name, 'Mæ’Dáryŋ ⟡ Æþ’Mør');
  assert.equal(list[0].firstName, 'Mæ’Dáryŋ');
  assert.equal(list[0].lastName, 'Æþ’Mør');
  // Main characters can be renamed or killed from the roster tab.
  await plugin.studio.updateMainCharacter(card.id, { firstName: 'Meggy', lifeStatus: 'dead' });
  assert.equal((await plugin.studio.listRoster('living')).length, 0);
  assert.equal((await plugin.studio.listRoster('dead'))[0].name, 'Meggy ⟡ Æþ’Mør');
  assert.equal((await plugin.studio.listMainCharacters())[0].inventoryText, 'Kılıç\n10 gümüş');
  await plugin.studio.updateMainCharacter(card.id, { lifeStatus: 'living' });
  assert.equal((await plugin.studio.listRoster('living'))[0].lifeStatus, 'living');
  const npc = await plugin.studio.createRosterEntity('npc');
  await plugin.studio.updateRosterEntity(npc.id, { firstName:'Örnek',lastName:'NPC',lifeStatus:'dead' });
  assert.equal((await plugin.studio.listRoster('dead'))[0].name, 'Örnek ⟡ NPC');
  await plugin.studio.updateRosterEntity(npc.id, { firstName: 'Düzenlenen', lastName: 'Kişi', lifeStatus:'living' });
  const rosterUpdated = await plugin.studio.listRoster('living');
  assert.equal(rosterUpdated.some(x => x.name === 'Düzenlenen ⟡ Kişi'), true);
});
