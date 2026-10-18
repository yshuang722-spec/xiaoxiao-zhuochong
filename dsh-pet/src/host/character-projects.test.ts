import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAllConfig, readPetConfigEntry } from './config.ts';

test('character projects override only their legacy entry and remain independent', () => {
  const root = mkdtempSync(join(tmpdir(), 'pet-projects-'));
  try {
    const petDir = join(root, 'pet');
    const project = join(root, 'characters', 'orange');
    mkdirSync(petDir, { recursive: true });
    mkdirSync(project, { recursive: true });
    const paths = {
      defaultFile: fileURLToPath(new URL('../../assets/config.jsonc', import.meta.url)),
      userFile: join(root, 'main-config.jsonc'),
      legacyUserFile: join(root, 'main-config.json'),
      petDir,
    };
    writeFileSync(paths.userFile, JSON.stringify({ pets: [{ id: 'main', name: 'blue', display: 'none' }] }));
    writeFileSync(join(petDir, 'orange-config.json'), JSON.stringify({ pets: [{ id: 'orange1', name: 'legacy' }] }));
    const configFile = join(project, 'config.json');
    writeFileSync(configFile, JSON.stringify({ pets: [{ id: 'orange1', name: 'orange', display: 'desktop' }] }));
    const before = readAllConfig(paths);
    assert.equal((before.orange.pets as {name:string}[])[0].name, 'orange');
    assert.equal(Object.keys(before).length, 2);
    assert.equal(readPetConfigEntry(paths, 'orange')?.path, configFile);
    writeFileSync(configFile, JSON.stringify({ pets: [{ id: 'orange1', name: 'changed', display: 'none' }] }));
    const after = readAllConfig(paths);
    assert.deepEqual(after.main, before.main);
    assert.equal((after.orange.pets as {name:string}[])[0].name, 'changed');
    rmSync(petDir, { recursive: true });
    assert.ok(readAllConfig(paths).orange, 'project discovery also works without the legacy directory');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
