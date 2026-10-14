const fs = require('node:fs/promises');
const path = require('node:path');
const { StorageAdapter } = require('./storage-adapter');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class JsonStore extends StorageAdapter {
  constructor({ filePath, seedPath }) {
    super();
    this.filePath = path.resolve(filePath);
    this.seedPath = path.resolve(seedPath);
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      const seed = JSON.parse(await fs.readFile(this.seedPath, 'utf8'));
      await this.write(seed);
    }
  }

  async read() {
    await this.initialize();
    return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
  }

  async write(state) {
    const payload = `${JSON.stringify(state, null, 2)}\n`;
    this.writeQueue = this.writeQueue.then(async () => {
      const tempPath = `${this.filePath}.tmp`;
      await fs.writeFile(tempPath, payload, 'utf8');
      await fs.rename(tempPath, this.filePath);
    });
    await this.writeQueue;
    return clone(state);
  }

  async update(mutator) {
    const current = await this.read();
    const next = await mutator(clone(current));
    return this.write(next);
  }

  async find(collection, filter = {}) {
    const state = await this.read();
    const list = Array.isArray(state[collection]) ? state[collection] : [];
    if (typeof filter === 'function') {
      return list.filter(filter);
    }
    return list.filter((item) => {
      for (const [key, value] of Object.entries(filter)) {
        if (item[key] !== value) return false;
      }
      return true;
    });
  }

  async insert(collection, item) {
    await this.update((state) => {
      state[collection] ||= [];
      state[collection].push(item);
      return state;
    });
    return item;
  }
}

module.exports = { JsonStore };
