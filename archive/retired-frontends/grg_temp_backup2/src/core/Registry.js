class Registry {
  constructor(name) {
    this.name = name;
    this.items = new Map();
  }

  register(key, item) {
    if (this.items.has(key)) {
      // In Hybrid Option C, we don't throw, we just mark as duplicated/merge candidate for the Scanner to handle.
      item._duplicated = true;
    }
    this.items.set(key, item);
  }

  get(key) {
    return this.items.get(key);
  }

  getAll() {
    return Array.from(this.items.values());
  }

  has(key) {
    return this.items.has(key);
  }
}

module.exports = { Registry };

