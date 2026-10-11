const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('all non-dialogue actions are isolated from the Markdown editor', () => {
  for (const file of ['src/presentation/RosterPanel.ts', 'src/presentation/CharacterCardsPanel.ts', 'src/infrastructure/obsidian/ObsidianSqliteStudioRepository.ts']) {
    const code = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(code, /editor\.replaceRange|editor\.replaceSelection|vault\.modify|vault\.process\(/u);
  }
  const writer = fs.readFileSync('src/application/writing/GenerateMeggySceneUseCase.ts', 'utf8');
  assert.match(writer, /this\.formatter\.dialogue\(speaker\?\.name \?\? "Meggy", dialogue, speaker\?\.kind \?\? "meggy", speaker\?\.id \?\? "meggy"\)/u);
  assert.match(writer, /this\.rollD240\.execute\(\)/u);
  assert.match(writer, /this\.rollEventStyle\.execute\(\)/u);
});
