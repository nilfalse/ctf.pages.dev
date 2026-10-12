import { defineConfig } from 'vite';

import * as country from './build/lib/country.ts';
import * as twemoji from './build/lib/twemoji.ts';
import territories from './build/plugins/territories.ts';
import wget from './build/plugins/wget.ts';

const LOCALES = ['en'];
const TWEMOJI_VERSION = '17.0.3';

export default defineConfig(async ({ command }) => {
  async function twemojiAssets() {
    const version = command === 'build' ? TWEMOJI_VERSION : 'latest';

    const pairs = Object.keys(await country.territories())
      /** Territory codes that CLDR lists but Twemoji has no flag for. */
      .filter((iso) => iso !== 'ZZ')
      .map((iso) => [
        `assets/twemoji/${iso}.svg`,
        twemoji.url(iso as TwoUppercaseLetters, version),
      ]);
    return Object.fromEntries(pairs);
  }

  const files = {
    ...(await twemojiAssets()),
  };

  return {
    plugins: [territories(LOCALES), wget({ files })],
  };
});
