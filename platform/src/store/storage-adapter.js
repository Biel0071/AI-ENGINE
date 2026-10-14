class StorageAdapter {
  async initialize() {
    throw new Error('StorageAdapter.initialize() must be implemented');
  }

  async read() {
    throw new Error('StorageAdapter.read() must be implemented');
  }

  async write(_state) {
    throw new Error('StorageAdapter.write() must be implemented');
  }

  async update(_mutator) {
    throw new Error('StorageAdapter.update() must be implemented');
  }

  async find(_collection, _filter) {
    throw new Error('StorageAdapter.find() must be implemented');
  }

  async insert(_collection, _item) {
    throw new Error('StorageAdapter.insert() must be implemented');
  }
}

module.exports = { StorageAdapter };
