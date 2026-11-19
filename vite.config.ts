/*
 * Copyright 2026 nilfalse.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { defineConfig, loadEnv } from 'vite';

import * as country from './lib/country.ts';
import * as twemoji from './lib/twemoji.ts';
import edges from './plugins/edges.ts';
import maxmind from './plugins/maxmind.ts';
import territories from './plugins/territories.ts';
import wget from './plugins/wget.ts';

export default defineConfig(async ({ command, mode }) => {
  const LOCALES = ['en'];
  const VERSION_TWEMOJI = command === 'build' ? '17.0.3' : 'latest';

  const countryCodes = Object.keys(await country.territories())
    /** Territory codes that CLDR lists but Twemoji has no flag for. */
    .filter((iso) => iso !== 'ZZ') as TwoUppercaseLetters[];

  const files = Object.fromEntries([
    ...countryCodes.map((iso) => [
      `assets/twemoji/${iso}.svg`,
      twemoji.url(iso, VERSION_TWEMOJI),
    ]),
  ]);

  return {
    plugins: [
      // '' prefix loads every variable, including process.env and CI
      maxmind(loadEnv(mode, process.cwd(), '')),
      territories(LOCALES),
      edges(),
      wget({ files }),
    ],
  };
});
