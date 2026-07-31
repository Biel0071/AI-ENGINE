const fs = require('fs');
const path = require('path');
const { StorageProvider } = require('../../storage-provider');

class LocalVectorDriver extends StorageProvider {
  constructor(options = {}) {
    super({ name: 'LocalVector', type: 'vector' });
    this.indexPath = options.indexPath || path.join(process.cwd(), '.data', 'vectors.json');
    this.index = {};
  }

  async connect() {
    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.indexPath)) {
      try {
        const raw = fs.readFileSync(this.indexPath, 'utf-8');
        this.index = JSON.parse(raw);
      } catch (err) {
        console.error('[LocalVectorDriver] Failed to parse vectors.json, starting fresh');
        this.index = {};
      }
    } else {
      this.index = {};
      this._save();
    }

    this.isConnected = true;
    return true;
  }

  async disconnect() {
    this._save();
    this.isConnected = false;
    return true;
  }

  _save() {
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  async set(key, value, collection = 'default') {
    if (!this.index[collection]) {
      this.index[collection] = {};
    }
    this.index[collection][key] = value;
    this._save();
    return true;
  }

  async get(key, collection = 'default') {
    if (!this.index[collection]) return null;
    return this.index[collection][key] || null;
  }

  async delete(key, collection = 'default') {
    if (!this.index[collection]) return false;
    delete this.index[collection][key];
    this._save();
    return true;
  }

  async find(query, collection = 'default') {
    // For a local mock, we just filter by a metadata field or text match since we don't do real cosine similarity here
    if (!this.index[collection]) return [];
    
    const results = [];
    const searchTerm = query.text ? query.text.toLowerCase() : '';
    
    for (const [id, data] of Object.entries(this.index[collection])) {
      let score = 0.0;
      
      if (searchTerm && data.text) {
         if (data.text.toLowerCase().includes(searchTerm)) {
           score = 0.8;
         }
      }
      
      results.push({ id, score, ...data });
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
}

module.exports = { LocalVectorDriver };
