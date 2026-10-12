import path from 'node:path';
import { buffer } from 'node:stream/consumers';
import { pipeline } from 'node:stream/promises';

import * as mime from 'mrmime';
import type { Plugin } from 'vite';

import pkg from '../../package.json' with { type: 'json' };
import { WebCache } from '../lib/WebCache.ts';
import * as maxmind from '../lib/maxmind.ts';

const DIR = 'maxmind';

const LIVE_URL = new URL(DIR, pkg.homepage).href;

interface Env extends maxmind.Env {
  CI?: string;
}

export default function plugin(env: Env): Plugin {
  let cache: WebCache;
  /** Files to emit on build: the whole release from the tarball, else just the database. */
  let names = ['GeoLite2-Country.mmdb'];

  return {
    name: 'maxmind',

    configResolved(config) {
      cache = new WebCache(path.resolve(config.cacheDir, DIR));
    },

    async buildStart() {
      if (env.CI || (env.MAXMIND_ACCOUNT_ID && env.MAXMIND_LICENSE_KEY)) {
        const files = await maxmind.download(env, cache);
        await Promise.all(
          files.map(([name, data]) =>
            cache.populate(`${LIVE_URL}/${name}`, data),
          ),
        );
        names = files.map(([name]) => name);
      }
    },

    configureServer(server) {
      server.middlewares.use(server.config.base + DIR, (req, res, next) => {
        const { pathname } = new URL(req.url!, 'http://x');

        return cache
          .get(LIVE_URL + pathname)
          .then((file) => {
            if (file) {
              const type = mime.lookup(pathname) ?? 'application/octet-stream';
              res.setHeader('Content-Type', type);
              return pipeline(file, res);
            } else {
              return next();
            }
          })
          .catch(next);
      });
    },

    async generateBundle() {
      for (const name of names) {
        const file = await cache.get(`${LIVE_URL}/${name}`);
        if (file) {
          const source = await buffer(file);
          this.emitFile({ type: 'asset', fileName: DIR + '/' + name, source });
        } else {
          this.error(`${LIVE_URL}/${name}: 404 Not Found`);
        }
      }
    },
  };
}
