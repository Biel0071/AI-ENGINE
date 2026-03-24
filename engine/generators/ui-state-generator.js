const STATE_IMPORT_REGEX = /import\s+\{[^}]*useState[^}]*\}\s+from\s+['\"]react['\"];?/;

function ensureReactStateImport(content = '') {
  const text = String(content || '');

  if (STATE_IMPORT_REGEX.test(text)) {
    return text;
  }

  if (/import\s+\{([^}]*)\}\s+from\s+['\"]react['\"];?/.test(text)) {
    return text.replace(/import\s+\{([^}]*)\}\s+from\s+['\"]react['\"];?/, (_all, inner) => {
      const parts = inner
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (!parts.includes('useState')) {
        parts.push('useState');
      }
      return `import { ${parts.join(', ')} } from 'react';`;
    });
  }

  return `import { useState } from 'react';\n${text}`;
}

function injectStatesIntoPage(content = '') {
  let text = ensureReactStateImport(content);

  if (/const \[isLoading, setIsLoading\]/.test(text)) {
    return text;
  }

  text = text.replace(
    /(export default function\s+[A-Za-z0-9_]+Page\s*\(\)\s*\{\n)/,
    "$1  const [isLoading, setIsLoading] = useState(false);\n  const [errorMessage, setErrorMessage] = useState('');\n  const [successMessage, setSuccessMessage] = useState('');\n\n  const handlePrimaryAction = async () => {\n    setErrorMessage('');\n    setSuccessMessage('');\n    setIsLoading(true);\n    try {\n      await Promise.resolve(true);\n      setSuccessMessage('Action completed successfully.');\n    } catch (error) {\n      setErrorMessage(String(error && error.message ? error.message : error));\n    } finally {\n      setIsLoading(false);\n    }\n  };\n\n",
  );

  text = text.replace(/<Button([^>]*)>([^<]*)<\/Button>/, '<Button$1 onClick={handlePrimaryAction} disabled={isLoading}>{isLoading ? \"Processing...\" : "$2"}</Button>');

  text = text.replace(
    /(<CardContent>\n)/,
    "$1              {errorMessage ? <div className=\"mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700\">{errorMessage}</div> : null}\n              {successMessage ? <div className=\"mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700\">{successMessage}</div> : null}\n",
  );

  return text;
}

function enhanceUIWithStates(files = []) {
  return files.map((file) => {
    const filePath = String(file.path || '');
    if (/frontend\/src\/pages\//i.test(filePath) && /\.tsx$|\.jsx$/i.test(filePath)) {
      return {
        ...file,
        content: injectStatesIntoPage(file.content || ''),
      };
    }

    return file;
  });
}

module.exports = {
  enhanceUIWithStates,
};
