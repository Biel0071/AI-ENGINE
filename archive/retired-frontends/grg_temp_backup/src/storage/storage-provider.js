class StorageProvider {
  constructor(options = {}) {
    this.name = options.name || 'UnknownStorage';
    this.type = options.type || 'unknown'; // document, relational, keyvalue, vector
    this.isConnected = false;
  }

  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  async set(key, value) {
    throw new Error('set() must be implemented by subclass');
  }

  async get(key) {
    throw new Error('get() must be implemented by subclass');
  }

  async delete(key) {
    throw new Error('delete() must be implemented by subclass');
  }

  async find(query) {
    throw new Error('find() must be implemented by subclass');
  }
  
  health() {
    return this.isConnected;
  }
}

module.exports = { StorageProvider };
