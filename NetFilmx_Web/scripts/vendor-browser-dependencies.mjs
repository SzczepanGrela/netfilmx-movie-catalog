import { readFile, readdir, mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const write = process.argv[2] === '--write';
if (!write && process.argv[2] !== '--check') throw new Error('Use --write or --check');

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Unexpected vendor entry: ${path}`);
  }
  return result;
}

for (const [name, license] of [
  ['bootstrap', 'LICENSE'],
  ['jquery', 'LICENSE.txt'],
  ['jquery-validation', 'LICENSE.md'],
  ['jquery-validation-unobtrusive', 'LICENSE.txt']
]) {
  const source = resolve(root, 'node_modules', name);
  const dist = join(source, 'dist');
  const target = resolve(root, 'wwwroot/lib', name);
  const prefix = name === 'jquery-validation-unobtrusive' ? '' : 'dist';
  const entries = (await files(dist)).filter(path => {
    const file = relative(dist, path);
    if (name === 'jquery') return ['jquery.js', 'jquery.min.js', 'jquery.min.map'].includes(file);
    if (name === 'jquery-validation') return dirname(file) === '.';
    return true;
  }).map(path => [path, join(prefix, relative(dist, path))]);
  entries.push([join(source, license), license]);
  if (write) {
    await rm(target, { recursive: true, force: true });
    for (const [path, name] of entries) {
      const output = join(target, name);
      await mkdir(resolve(output, '..'), { recursive: true });
      await copyFile(path, output);
    }
  } else {
    const actual = (await files(target)).map(path => relative(target, path)).sort();
    const expected = entries.map(([, name]) => name).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Vendor file inventory differs for ${name}; run npm run vendor`);
    for (const [path, file] of entries) {
      if (!(await readFile(path)).equals(await readFile(join(target, file))))
        throw new Error(`Vendor content differs: ${name}/${file}`);
    }
  }
}
console.log(write ? 'Browser dependencies regenerated.' : 'Browser dependencies match the locked packages.');
