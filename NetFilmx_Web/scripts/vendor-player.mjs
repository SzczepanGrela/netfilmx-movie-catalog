import { readFile, mkdir, readdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const write = process.argv[2] === '--write';
async function files(dir) {
  const entries = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) entries.push(...await files(p));
    else if (entry.isFile()) entries.push(p);
    else throw Error('Unexpected player dependency entry');
  }
  return entries;
}
const specs = [
  ['@vidstack/cdn', 'vidstack', p => p.endsWith('.js') || p.endsWith('.css')],
  ['media-captions', 'media-captions', p => /^(dist\/prod\.js|dist\/prod\/.*\.js|LICENSE)$/.test(p)],
  ['media-icons', 'media-icons', p => /^(dist\/cdn\.js|dist\/icons\/.*\.js|LICENSE)$/.test(p)],
  ['hls.js', 'hls.js', p => p === 'dist/hls.min.js' || p === 'LICENSE']
];
const cdn = 'https://cdn.jsdelivr.net/npm/@vidstack/cdn@1.15.7/';
for (const [pkg, name, include] of specs) {
  const source = resolve(root, 'node_modules', pkg), target = resolve(root, 'wwwroot/lib', name);
  const expected = [];
  for (const file of await files(source)) {
    const local = relative(source, file).replaceAll('\\', '/');
    if (!include(local)) continue;
    let bytes = await readFile(file);
    if (pkg === '@vidstack/cdn' && local.endsWith('.js')) {
      const replacements = [
        [cdn, 'vidstack/'],
        ['https://cdn.jsdelivr.net/npm/media-captions@1.0.4/dist/prod.js/+esm', 'media-captions/dist/prod.js'],
        ['https://cdn.jsdelivr.net/npm/media-icons@1.1.5/dist/cdn.js/+esm', 'media-icons/dist/cdn.js'],
        ['https://cdn.jsdelivr.net/npm/hls.js@^1.5.0/dist/hls.min.js', 'hls.js/dist/hls.min.js'],
        ['https://cdn.jsdelivr.net/npm/hls.js@^1.0.0/dist/hls.min.js', 'hls.js/dist/hls.min.js']
      ];
      let js = bytes.toString('utf8');
      for (const [url, destination] of replacements) {
        const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        js = js.replace(new RegExp(escaped + (url === cdn ? '([^"\'`\\s]+)' : ''), 'g'), (_match, suffix) => {
          const resolved = resolve(root, 'wwwroot/lib', destination + (url === cdn ? suffix : ''));
          const result = relative(dirname(join(target, local)), resolved).replaceAll('\\', '/');
          return result.startsWith('.') ? result : './' + result;
        });
      }
      bytes = Buffer.from(js);
    }
    expected.push([local, bytes]);
  }
  if (name === 'vidstack') expected.push(['LICENSE', await readFile(join(root, 'scripts/licenses/vidstack-1.15.7.txt'))]);
  if (write) {
    await rm(target, { force: true, recursive: true });
    for (const [file, bytes] of expected) {
      const output = join(target, file);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, bytes);
    }
  } else {
    const inventory = (await files(target)).map(p => relative(target, p).replaceAll('\\', '/')).sort();
    if (JSON.stringify(inventory) !== JSON.stringify(expected.map(([p]) => p).sort())) throw Error(`Player inventory differs: ${name}`);
    for (const [file, bytes] of expected)
      if (!(await readFile(join(target, file))).equals(bytes)) throw Error(`Player dependency differs: ${name}/${file}`);
  }
}
console.log('Pinned local player dependencies ' + (write ? 'generated.' : 'verified.'));
