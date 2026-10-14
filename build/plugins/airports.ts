import path from 'node:path';

import pMemoize from 'p-memoize';
import * as prettier from 'prettier';
import type { Plugin } from 'vite';

import { WebCache } from '../lib/WebCache.ts';
import * as airports from '../lib/airports.ts';

const FILE_NAME = 'datasets/airports.json';

export default function plugin(): Plugin {
  let cache: WebCache;

  const load = pMemoize(async () => {
    const csv = await cache.get(airports.URL);
    if (!csv) {
      throw new Error(`${airports.URL}: 404 Not Found`);
    }
    return airports.iataCodes(csv);
  });

  return {
    name: 'airports',

    configResolved(config) {
      cache = new WebCache(path.join(config.cacheDir, 'airports'));
    },

    configureServer(server) {
      server.middlewares.use(
        server.config.base + FILE_NAME,
        (_req, res, next) =>
          load().then(async (data) => {
            const json = JSON.stringify(data);
            res.setHeader('Content-Type', 'application/json');
            res.end(await prettier.format(json, { parser: 'json' }));
          }, next),
      );
    },

    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: FILE_NAME,
        source: JSON.stringify(await load()),
      });
    },
  };
}
