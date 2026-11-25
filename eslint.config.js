import js from '@eslint/js';

const nodeGlobals = Object.fromEntries(
  [
    'process',
    'Buffer',
    'URL',
    'URLSearchParams',
    'console',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
    'fetch',
    'AbortController',
    'AbortSignal',
    'FormData',
    'Blob',
    'Headers',
  ].map((name) => [name, 'readonly']),
);
const browserGlobals = Object.fromEntries(
  [
    'window',
    'document',
    'navigator',
    'history',
    'location',
    'URL',
    'URLSearchParams',
    'fetch',
    'AbortController',
    'setTimeout',
    'clearTimeout',
    'FormData',
    'console',
  ].map((name) => [name, 'readonly']),
);

export default [
  { ignores: ['node_modules/**', 'storage/**', 'packages/ui/assets/**'] },
  js.configs.recommended,
  {
    plugins: {
      docksite: {
        rules: {
          'no-comments': {
            meta: { type: 'problem', schema: [] },
            create(context) {
              return {
                Program() {
                  for (const comment of context.sourceCode.getAllComments())
                    context.report({ loc: comment.loc, message: 'Code comments are not allowed.' });
                },
              };
            },
          },
        },
      },
    },
    rules: { 'docksite/no-comments': 'error' },
  },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: nodeGlobals },
  },
  { files: ['**/public/*.js'], languageOptions: { globals: browserGlobals } },
];
