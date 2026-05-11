const { esbuildDecorators } = require('esbuild-decorators');
const { TsconfigPathsPlugin } = require('@esbuild-plugins/tsconfig-paths');
const { fixExtensionsPlugin } = require('esbuild-fix-imports-plugin');
module.exports = {
  plugins: [
    esbuildDecorators({}),
    TsconfigPathsPlugin({}),
    fixExtensionsPlugin(),
  ],
  sourcemap: true,
  platform: 'node',
  format: 'esm',
  outExtension: {
    '.js': '.mjs',
  },
  tsconfig: './tsconfig.json',
  packages: 'external',
  loader: {
    '.html': 'text',
    '.fjs': 'text',
    '.hbs': 'text',
    '.mjml': 'text',
  },
};
