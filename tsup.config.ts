import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    clean: false,
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: { telegram: 'src/adapters/telegram.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    sourcemap: true,
    external: ['telegraf', 'botwallets'],
  },
  {
    entry: { slack: 'src/adapters/slack.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    sourcemap: true,
    external: ['@slack/bolt', 'botwallets'],
  },
]);
