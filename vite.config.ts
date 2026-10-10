import { defineConfig } from 'vite';

import territories from './build/plugins/territories.ts';

export default defineConfig({
  plugins: [territories(['en'])],
});
