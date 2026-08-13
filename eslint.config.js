import globals from 'globals';

/*
 * Narrow on purpose. This exists because `8dc10e9` shipped a renamed variable
 * with three usages left behind in JSX: `vite build` compiled it happily and
 * every OutletCard render threw ReferenceError, blanking the dashboard for two
 * hours. `no-undef` catches that in under a second.
 *
 * It is not a style pass. Formatting arguments are not worth a rule nobody
 * runs, and a linter that cries wolf gets ignored — which is how the useful
 * rules stop working.
 *
 * `no-unused-vars` is deliberately OFF for the same reason it is off in the
 * phone repo: without eslint-plugin-react, every component referenced only in
 * JSX reads as unused, and that much noise buries the real findings.
 * (FROM-THE-PHONE-REPO.md §32.)
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        // Vite injects these; they are not browser globals.
        ...globals.es2021,
      },
    },
    rules: {
      // The one that matters — an identifier used but never declared,
      // imported, or global.
      'no-undef': 'error',

      // Structural mistakes that also survive a build and fail at runtime.
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-self-assign': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
];
