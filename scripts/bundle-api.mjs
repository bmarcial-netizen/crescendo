/**
 * Bundles the Vercel serverless function entry point with esbuild.
 * Resolves all relative TypeScript imports into a single file so
 * Node.js ESM doesn't choke on extensionless imports.
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: '_api-bundle.js',
  packages: 'external',          // keep node_modules imports external
  sourcemap: false,
  banner: {
    // Some npm packages use require(); provide a shim for ESM
    js: `import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);`,
  },
});

console.log('API bundle created → _api-bundle.js');
