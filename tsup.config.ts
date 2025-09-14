import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disabled due to project structure issues
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
    '@cvplus/i18n',
    'stripe'
  ]
});