import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const editorFiles = ['admin.html', 'admin.js', 'admin.css', 'admin-simple.js', 'admin-simple.css', 'admin-catalog.js', 'admin-news.js', 'admin-editor-tools.js', 'admin-workspace.js', 'admin-workspace.css', 'admin-preview-bridge.js'];
export const publicationPaths = ['content.js', ...editorFiles, 'assets/uploads'];

export function parseContent(source) {
  const match = source.match(/^\s*window\.SKBC_CONTENT\s*=\s*([\s\S]*?);?\s*$/);
  if (!match) throw new Error('El contenido publicado no tiene el formato esperado.');
  return JSON.parse(match[1]);
}

export function verifyBaseline(baseline, remote) {
  if (!baseline || !baseline.settings || !baseline.languages) throw new Error('Recarga el editor antes de publicar.');
  if (JSON.stringify(baseline) !== JSON.stringify(remote)) {
    throw new Error('La web ha cambiado desde que abriste el editor. Descarga una copia de tus cambios en Configuración antes de recargar; no se ha publicado nada.');
  }
}

export async function writeEditorPublication(localDir, targetDir, content) {
  if (!content?.settings || !content?.languages) throw new Error('El contenido de la web está incompleto.');
  await mkdir(targetDir, { recursive: true });
  for (const name of editorFiles) await cp(resolve(localDir, name), resolve(targetDir, name));
  const uploads = resolve(localDir, 'assets/uploads');
  try {
    await stat(uploads);
    await cp(uploads, resolve(targetDir, 'assets/uploads'), { recursive: true, force: false, errorOnExist: false });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(resolve(targetDir, 'content.js'), `window.SKBC_CONTENT = ${JSON.stringify(content, null, 2)};\n`, 'utf8');
}
