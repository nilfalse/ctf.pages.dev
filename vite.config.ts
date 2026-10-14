import { defineConfig, loadEnv } from 'vite';

import * as country from './build/lib/country.ts';
import * as twemoji from './build/lib/twemoji.ts';
import airports from './build/plugins/airports.ts';
import maxmind from './build/plugins/maxmind.ts';
import territories from './build/plugins/territories.ts';
import wget from './build/plugins/wget.ts';

const LOCALES = ['en'];
const TWEMOJI_VERSION = '17.0.3';

export default defineConfig(async ({ command, mode }) => {
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
    plugins: [
      // '' prefix loads every variable, including process.env and CI
      maxmind(loadEnv(mode, process.cwd(), '')),
      territories(LOCALES),
      airports(),
      wget({ files }),
    ],
  };
});
