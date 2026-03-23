const path = require('path');

class TemplateEngine {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir || path.join(__dirname, '..', 'templates');
  }

  renderFromString(template, context = {}) {
    return String(template || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_all, token) => {
      const value = token.split('.').reduce((acc, key) => {
        if (acc && typeof acc === 'object' && key in acc) {
          return acc[key];
        }
        return '';
      }, context);

      return String(value == null ? '' : value);
    });
  }

  renderFileMap(fileMap = [], context = {}) {
    return fileMap.map((file) => ({
      path: this.renderFromString(file.path, context),
      content: this.renderFromString(file.content, context),
    }));
  }
}

module.exports = {
  TemplateEngine,
};
