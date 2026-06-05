module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, browser: true, es2022: true },
  ignorePatterns: ['out/', 'dist/', 'node_modules/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    // no-undef is redundant with TypeScript's own type-checking and produces false positives
    // for globals like 'vi' (Vitest) that TS knows about but ESLint doesn't see
    'no-undef': 'off'
  }
}
