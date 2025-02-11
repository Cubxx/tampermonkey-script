import { Glob } from 'bun';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

// file dirs
const SRC = path.join(import.meta.dir, '../src');
const DIST = path.join(import.meta.dir, '../dist');
const SCRIPTS = (
  await Array.fromAsync(new Glob('*.user.js').scan({ cwd: SRC }))
).sort();
await Bun.$`mkdir -p ${DIST}`;

// input
const prompt = (msg: string, defaultValue?: string) => {
  const result = globalThis.prompt(
    ...(defaultValue ? [msg, defaultValue] : [msg]),
  );
  if (result === null) throw new Error('User cancelled');
  return result;
};
const TARGETS = prompt(
  SCRIPTS.reduceRight(
    (acc, e, i) => '\n' + (i + 1) + ' ' + e.replace('.user.js', '') + acc,
    '\nEnter the target file indexes (comma-separated):',
  ),
)
  .split(',')
  .map((e) => SCRIPTS[+e - 1]!);
const REQUIRE_PREFIX = prompt(
  'Enter require URL prefix:',
  'https://127.0.0.1/tm',
);
const BROWSER = prompt('Enter the browser to use:', 'firefox');

// move meta
for (const target of TARGETS) {
  const from = path.join(SRC, target);
  const to = path.join(DIST, target);

  const p = Promise.withResolvers<void>();
  const read_s = createReadStream(from).on('error', p.reject);
  const write_s = createWriteStream(to, { flags: 'w' })
    .once('finish', p.resolve)
    .on('error', p.reject);
  let done = false;
  const rl = createInterface({ input: read_s, crlfDelay: Infinity })
    .on('line', (line) => {
      if (done) return;
      if (line.startsWith('// ==/UserScript==')) {
        write_s.write(`// @require  ${REQUIRE_PREFIX}/${path.basename(to)}\n`);
        write_s.write(line + '\n');
        write_s.end();
        rl.close();
        done = true;
        return;
      }
      write_s.write(line + '\n');
    })
    .on('error', (err) => write_s.destroy(err));
  await p.promise;

  await Bun.$`${BROWSER} file://${to}`;
}
