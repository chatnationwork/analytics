const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/sdk.js',
  format: 'iife', // Immediately Invoked Function Expression for browser <script>
  globalName: 'analytics_sdk', // Use a temporary global name, the snippet manages window.analytics
  platform: 'browser',
  target: ['es2020'],
  minify: true,
}).catch(() => process.exit(1));

console.log('Build complete');
