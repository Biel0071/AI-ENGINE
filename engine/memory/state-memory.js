class StateMemory {
  constructor() {
    this.state = {};
  }

  async get(key) {
    return this.state[String(key || '')] || null;
  }

  async set(key, value) {
    this.state[String(key || '')] = value;
  }
}

module.exports = {
  StateMemory,
};
