// ESLint configuration for ESLint v9+
export default [
  {
    ignores: ['old_player.js'],
  },
  {
    files: ['**/*.{js,ts}', '!node_modules/**'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // Add or adjust rules as needed
    },
  },
];
