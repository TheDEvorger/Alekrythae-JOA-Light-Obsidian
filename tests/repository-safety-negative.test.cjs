'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const guard = fs.readFileSync('scripts/repo-safety-check.cjs');
const required = [
  '.github/CODEOWNERS',
  '.github/ISSUE_TEMPLATE/bug_report.yml', '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml', '.github/pull_request_template.md'
];

function withFixture(files, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joa-guard-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'), {recursive: true});
    fs.writeFileSync(path.join(root, 'scripts/repo-safety-check.cjs'), guard);
    for (const file of required) {
      const name = path.join(root, file);
      fs.mkdirSync(path.dirname(name), {recursive: true});
      fs.writeFileSync(name, 'safe placeholder\n');
    }
    for (const [relative, content] of Object.entries(files)) {
      const file = path.join(root, relative);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, content);
    }
    return fn(root);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
}
function run(root) { return spawnSync(process.execPath, [path.join(root,'scripts/repo-safety-check.cjs')],{cwd:root,encoding:'utf8'}); }

test('clean repository fixture passes the fail-closed scanner', () => {
  withFixture({'src/infrastructure/sqlite/Codec.ts':'export const test = 1;\n'}, root => {
    assert.equal(run(root).status, 0);
  });
});
for (const name of ['.npmrc', 'credentials.json', 'src/.env.production',
  'vault/characters.sqlite3', 'vault/inventory.sqlite-journal', 'vault/.ssh/id_ed25519']) {
  test(`sensitive ${name} is rejected even before Git stage`, () => {
    withFixture({[name]:'dummy placeholder'},root => {
      assert.notEqual(run(root).status,0);
    });
  });
}

test('a fake provider token is rejected inside an ordinary README', () => {
  withFixture({'README.md':'Authentication example: github_' + 'pat_' + 'A'.repeat(50)},root => {
    assert.notEqual(run(root).status,0);
  });
});

test('Git-tracked private files fail even if ignored later', () => {
  withFixture({'src/index.ts':'export {}'},root => {
    execFileSync('git',['init','-q'],{cwd:root});
    fs.writeFileSync(path.join(root,'.npmrc'),'dummy');
    execFileSync('git',['add','-f','.npmrc'],{cwd:root});
    assert.notEqual(run(root).status,0);
  });
});

test('real gitignore ignores secret paths but not TypeScript SQLite modules', () => {
  withFixture({'.gitignore':fs.readFileSync('.gitignore')},root => {
    execFileSync('git',['init','-q'],{cwd:root});
    const ignored = ['story/.obsidian/plugins/joa-frp-writer/sqlite/inventory.sqlite',
      'story/inventory.sqlite-journal','story/archive.db3','story/.npmrc','story/.ssh/id_ed25519',
      'story/credentials.json','story/.joa/private.json'];
    for (const file of ignored) {
      assert.equal(spawnSync('git',['check-ignore','-q',file],{cwd:root}).status,0,file);
    }
    assert.notEqual(spawnSync('git',['check-ignore','-q','src/infrastructure/sqlite/FixedPayloadSqliteCodec.ts'],{cwd:root}).status,0);
    assert.notEqual(spawnSync('git',['check-ignore','-q','assets/joa-light-cover.webp'],{cwd:root}).status,0);
  });
});
