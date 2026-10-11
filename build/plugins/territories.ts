import type { Plugin } from 'vite';

import * as country from '../lib/country.ts';

const file = (locale: string) => `locales/${locale}/territories.json`;

export default function territories(locales = ['en']): Plugin {
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

          country.territories(locale).then((list) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(list));
          }, next);
        },
      );
    },

    async generateBundle() {
      for (const locale of locales) {
        this.emitFile({
          type: 'asset',
          fileName: file(locale),
          source: JSON.stringify(await country.territories(locale)),
        });
      }
    },
  };
}
