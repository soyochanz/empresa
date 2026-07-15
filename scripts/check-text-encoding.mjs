import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const checkedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.html', '.md']);
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const suspiciousCodePoints = new Set([0x00c2, 0x00c3, 0x00e2, 0x00f0, 0xfffd]);
const failures = [];

async function inspectDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspectDirectory(absolutePath);
      continue;
    }
    if (!checkedExtensions.has(path.extname(entry.name))) continue;

    const content = await readFile(absolutePath, 'utf8');
    content.split(/\r?\n/).forEach((line, index) => {
      if ([...line].some(character => suspiciousCodePoints.has(character.codePointAt(0)))) {
        failures.push(`${path.relative(root, absolutePath)}:${index + 1}`);
      }
    });
  }
}

await inspectDirectory(root);
if (failures.length) {
  console.error('Se han detectado textos con posible codificación UTF-8 corrupta:');
  failures.forEach(file => console.error(`- ${file}`));
  console.error('Corrige el texto original antes de compilar. No conviertas UTF-8 a Windows-1252/Latin-1.');
  process.exit(1);
}

console.log('Codificación de textos verificada: UTF-8 sin secuencias corruptas.');
