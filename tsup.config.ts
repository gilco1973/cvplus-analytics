import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disable DTS generation
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node18',
  external: [
    'firebase',
    'firebase-admin', 
    'firebase-functions',
    '@cvplus/core',
    '@cvplus/auth',
    'stripe'
  ]
});