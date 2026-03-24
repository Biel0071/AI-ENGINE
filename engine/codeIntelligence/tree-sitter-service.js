const fs = require('fs/promises');
const path = require('path');

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

function supportsSource(filePath = '') {
  return SOURCE_EXTENSIONS.has(path.extname(String(filePath || '')).toLowerCase());
}

function fallbackSymbols(content = '') {
  const text = String(content || '');
  const components = [...text.matchAll(/(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  const functions = [...text.matchAll(/(?:function|const)\s+([a-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  const imports = [...text.matchAll(/import\s+[^'"`]+from\s+['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);

  return {
    parser: 'fallback-regex',
    components,
    functions,
    imports,
  };
}

class TreeSitterService {
  constructor(options = {}) {
    this.options = options;
    this.cached = null;
  }

  async loadParser() {
    if (this.cached) {
      return this.cached;
    }

    try {
      const Parser = require('tree-sitter');
      const JavaScript = require('tree-sitter-javascript');
      const parser = new Parser();
      parser.setLanguage(JavaScript);
      this.cached = {
        parser,
        parserName: 'tree-sitter-javascript',
        mode: 'native',
      };
      return this.cached;
    } catch {
      // Try web-tree-sitter runtime as a non-native fallback.
      try {
        const Parser = require('web-tree-sitter');
        const wasmPath = this.options.javascriptWasmPath || process.env.TREE_SITTER_JS_WASM || '';
        if (!wasmPath) {
          this.cached = null;
          return null;
        }

        const initialize = Parser.init ? Parser.init.bind(Parser) : Parser.default && Parser.default.init ? Parser.default.init.bind(Parser.default) : null;
        if (!initialize) {
          this.cached = null;
          return null;
        }

        await initialize();

        const Language = Parser.Language || (Parser.default && Parser.default.Language);
        const ParserCtor = Parser.Parser || (Parser.default && Parser.default.Parser);
        if (!Language || !ParserCtor) {
          this.cached = null;
          return null;
        }

        const language = await Language.load(wasmPath);
        const parser = new ParserCtor();
        parser.setLanguage(language);

        this.cached = {
          parser,
          parserName: 'web-tree-sitter-javascript',
          mode: 'web',
        };
        return this.cached;
      } catch {
        this.cached = null;
        return null;
      }
    }
  }

  async parseSource(content = '') {
    const loaded = await this.loadParser();
    if (!loaded) {
      return fallbackSymbols(content);
    }

    const tree = loaded.parser.parse(String(content || ''));
    const root = tree.rootNode;
    const components = [];
    const functions = [];
    const imports = [];

    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!node) {
        continue;
      }

      if (node.type === 'import_statement' || node.type === 'import_declaration') {
        const raw = node.text || '';
        const importMatch = raw.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (importMatch && importMatch[1]) {
          imports.push(importMatch[1]);
        }
      }

      if (node.type === 'function_declaration' || node.type === 'lexical_declaration') {
        const raw = node.text || '';
        const fn = raw.match(/(?:function|const|let|var)\s+([A-Za-z0-9_]+)/);
        if (fn && fn[1]) {
          if (/^[A-Z]/.test(fn[1])) {
            components.push(fn[1]);
          } else {
            functions.push(fn[1]);
          }
        }
      }

      const children = node.namedChildren || [];
      for (const child of children) {
        stack.push(child);
      }
    }

    return {
      parser: loaded.parserName,
      components: Array.from(new Set(components)),
      functions: Array.from(new Set(functions)),
      imports: Array.from(new Set(imports)),
    };
  }

  async analyzeFiles(files = []) {
    const report = [];

    for (const file of files) {
      const filePath = typeof file === 'string' ? file : file.path;
      const content = typeof file === 'string' ? await fs.readFile(filePath, 'utf8') : String(file.content || '');

      if (!supportsSource(filePath)) {
        continue;
      }

      report.push({
        path: filePath,
        symbols: await this.parseSource(content),
      });
    }

    return report;
  }
}

module.exports = {
  TreeSitterService,
};
