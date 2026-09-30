const tseslint = require('typescript-eslint');
const fs = require('node:fs');
const path = require('node:path');
const ignores = fs
  .readFileSync(path.join(__dirname, '.gitignore'), 'utf8')
  .split(/\r?\n/)
  .map((linea) => linea.trim())
  .filter((linea) => linea && !linea.startsWith('#'))
  .map((patron) => (patron.endsWith('/') ? `${patron}**` : patron));
module.exports = tseslint.config({ ignores }, ...tseslint.configs.recommended, {
  files: ['**/*.js'],
  languageOptions: {
    globals: {
      require: 'readonly',
      module: 'readonly',
      process: 'readonly',
      __dirname: 'readonly',
    },
  },
  rules: { '@typescript-eslint/no-require-imports': 'off' },
});
