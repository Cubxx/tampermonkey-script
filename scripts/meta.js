import { exec } from 'child_process';
import fs from 'fs/promises';
import pth from 'path';
import { createInterface, Interface } from 'readline';

/** @param {string} filepath */
async function readline(filepath, replace = false) {
  await fs.access(filepath).catch(() => fs.writeFile(filepath, '', 'utf-8'));
  const input = await fs.open(filepath);
  if (!replace)
    return createInterface({
      input: input.createReadStream(),
      terminal: false,
    }).on('close', () => input.close());
  const { dir, name } = pth.parse(filepath);
  const tmppath = pth.join(dir, name + '.tmp');
  const output = await fs.open(tmppath, 'w');
  return createInterface({
    input: input.createReadStream(),
    output: output.createWriteStream(),
    terminal: false,
  }).on('close', async () => {
    await input.close();
    await output.close();
    await fs.rename(tmppath, filepath);
  });
}
/** @param {Interface} rl */
function eachLine(rl) {
  /**
   * @typedef {'no-meta'
   *   | 'before-meta'
   *   | 'meta'
   *   | 'invalid-meta'
   *   | 'before-content'
   *   | 'content'} EventType
   */
  const h = {
    queues: {},
    /** @param {EventType} name @param {(line: string) => void} cb */
    on(name, cb) {
      (this.queues[name] ??= []).push(cb);
      return this;
    },
    /** @param {EventType} name @param {string} line */
    emit(name, line) {
      this.queues[name]?.forEach((cb) => cb(line));
    },
  };
  let state = 0;
  const stateCb = {
    0(line) {
      if (line === '// ==UserScript==') {
        state = 1;
        h.emit('before-meta', line);
      } else {
        state = 2;
        h.emit('no-meta', line);
      }
    },
    1(line) {
      if (line.startsWith('// @')) h.emit('meta', line);
      else if (line === '// ==/UserScript==') {
        state = 2;
        h.emit('before-content', line);
      } else {
        h.emit('invalid-meta', line);
      }
    },
    2(line) {
      h.emit('content', line);
    },
  };
  rl.on('line', (line) => stateCb[state](line));
  return h;
}

const cfg = /** @type {const} */ ({
  cwd: process.cwd().replaceAll(pth.sep, '/'),
  dest: 'meta',
  src: 'src',
});
/** @typedef {[string, string][]} Metadata */
const meta = {
  /** @param {string} text @returns {Metadata} */
  parse(text) {
    return [...text.matchAll(/\/\/ @([\w-]+) +([^\n]+)\n/g)].map(
      ([_, k, v]) => [k, v],
    );
  },
  /** @param {Metadata} data */
  stringify(data) {
    const max = data.reduce(
      (acc, [k]) => (acc > k.length ? acc : k.length),
      12,
    );
    return data.map(([k, v]) => `// @${k.padEnd(max)} ${v}`).join('\n');
  },
};
const file = {
  /** @param {string} filepath @returns {Promise<Metadata>} */
  async parse(filepath) {
    let text = '';
    const rl = await readline(filepath);
    return new Promise((resolve) => {
      eachLine(rl)
        .on('no-meta', () => {
          console.error('No metadata: ' + filepath);
          resolve([]);
        })
        .on('invalid-meta', () => {
          console.error('Invalid metadata: ' + filepath);
          resolve([]);
        })
        .on('meta', (line) => {
          text += line + '\n';
        })
        .on('before-content', () => {
          rl.close();
          resolve(meta.parse(text));
        });
    });
  },
  /** @param {string} filepath @param {Metadata} data */
  async update(filepath, data) {
    const rl = await readline(filepath, true);
    const write = (line) => rl.output.write(line + '\n');
    eachLine(rl)
      .on('before-meta', (line) => {
        write(line);
        write(meta.stringify(data));
      })
      .on('before-content', write)
      .on('content', write);
  },
};
const _ = {
  /**
   * @param {string} name
   * @param {'local' | 'url'} type
   */
  resolve(name, dir = cfg.src, type = 'local') {
    if (type === 'local') return [cfg.cwd, dir, name].join('/');
    return `https://cdn.jsdelivr.net/gh/Cubxx/tampermonkey-script/${dir}/${name}`;
  },
  /** @param {(name: string) => void} cb */
  async eachFile(cb) {
    for await (const item of await fs.opendir(cfg.src)) {
      if (item.isDirectory()) throw 'Not support directory: ' + item.path;
      cb(item.name);
    }
  },
};
const app = {
  src() {
    _.eachFile(async (name) => {
      const filepath = _.resolve(name);
      const data = await file.parse(filepath);
      for (const e of data) {
        if (e[0] === 'require' || e[0].endsWith('URL')) {
          e[1] = _.resolve(...e[1].split('/').slice(-2).reverse(), 'url');
        }
      }
      file.update(filepath, data);
    });
  },
  async meta() {
    await fs.mkdir(cfg.dest, { recursive: true });
    _.eachFile(async (name) => {
      const filepath = _.resolve(name);
      const newData = (await file.parse(filepath)).filter(
        ([k]) => k !== 'downloadURL',
      );
      for (const e of newData) {
        if (e[0] === 'require') {
          e[1] = 'file:///' + _.resolve(...e[1].split('/').slice(-2).reverse());
        } else if (e[0] === 'updateURL') {
          e[0] = 'require';
          e[1] = 'file:///' + filepath;
        }
      }
      const metapath = _.resolve(name, cfg.dest);
      const oldData = await file.parse(metapath);
      if (oldData.toString() !== newData.toString()) {
        exec('start msedge ' + metapath);
        file.update(metapath, newData);
        console.log('Update: ' + name);
      } else {
        console.log('No change: ' + name);
      }
    });
  },
};
app.meta();
