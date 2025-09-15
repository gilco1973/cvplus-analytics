import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disabled - needs missing file fixes
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
    '@cvplus/logging',
    'stripe'
  ]
});