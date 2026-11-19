/*
 * Copyright 2026 nilfalse.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as prettier from 'prettier';
import type { Plugin } from 'vite';

import * as country from '../lib/country.ts';

export default function territories(locales: string[]): Plugin {
  return {
    name: 'territories',

    configureServer(server) {
      const pattern = new URLPattern({ pathname: `/:locale/territories.json` });

      server.middlewares.use(
        server.config.base + 'locales/',
        (req, res, next) => {
          const { pathname } = new URL(req.url!, 'http://x');
          const locale = pattern.exec({ pathname })?.pathname.groups.locale;
          if (!locale) {
            return next();
          }

          country.territories(locale).then(async (list) => {
            const json = JSON.stringify(list);
            res.setHeader('Content-Type', 'application/json');
            res.end(await prettier.format(json, { parser: 'json' }));
          }, next);
        },
      );
    },

    async generateBundle() {
      for (const locale of locales) {
        this.emitFile({
          type: 'asset',
          fileName: `locales/${locale}/territories.json`,
          source: JSON.stringify(await country.territories(locale)),
        });
      }
    },
  };
}
