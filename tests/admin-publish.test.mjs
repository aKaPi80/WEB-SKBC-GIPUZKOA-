import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('publication updates the editor and content without replacing public application files', async () => {
  const { writeEditorPublication, parseContent, verifyBaseline } = await import('../scripts/admin-publication.mjs');
  const root = await mkdtemp(join(tmpdir(), 'skbc-admin-'));
  const local = join(root, 'local');
  const target = join(root, 'target');
  try {
    await mkdir(local); await mkdir(target);
    for (const name of ['admin.html', 'admin.js', 'admin.css', 'admin-simple.js', 'admin-simple.css', 'admin-catalog.js', 'admin-news.js']) await writeFile(join(local, name), name);
    await writeFile(join(local, 'app.js'), 'OLD APP');
    await writeFile(join(target, 'app.js'), 'CURRENT APP');
    await mkdir(join(target, 'assets'), { recursive: true });
    await writeFile(join(target, 'assets', 'keep.txt'), 'keep');
    const baseline = { settings: {}, languages: { es: { title: 'Before' } } };
    const edited = { settings: {}, languages: { es: { title: 'After' } } };
    verifyBaseline(baseline, baseline);
    assert.throws(() => verifyBaseline(baseline, edited), /cambiado/);
    await writeEditorPublication(local, target, edited);
    assert.equal(await readFile(join(target, 'app.js'), 'utf8'), 'CURRENT APP');
    assert.equal(await readFile(join(target, 'assets', 'keep.txt'), 'utf8'), 'keep');
    assert.deepEqual(parseContent(await readFile(join(target, 'content.js'), 'utf8')), edited);
  } finally { await rm(root, { recursive: true, force: true }); }
});
