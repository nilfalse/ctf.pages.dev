import path from 'node:path';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import { pipeline } from 'node:stream/promises';

import * as mime from 'mrmime';
import type { Plugin } from 'vite';

import { WebCache } from '../lib/WebCache.ts';

const DEFAULT_CONCURRENCY = 16;

interface Options {
  /** Files to download, as `{ [served and emitted path]: source URL }`. */
  files: Record<string, string>;
  /** How many files are downloaded at once on build. */
  concurrency?: number;
}

export default function wget({ files, concurrency }: Options): Plugin {
  let cache: WebCache;

  return {
    name: 'wget',

    configResolved(config) {
      cache = new WebCache(path.join(config.cacheDir, 'wget'));
    },

    configureServer(server) {
      server.middlewares.use(server.config.base, async (req, res, next) => {
        const { pathname } = new URL(req.url!, 'http://x');
        const name = pathname.slice(1);

        const url = files[name];
        if (!url) {
          return next();
        }

        return cache
          .get(url)
          .then((file) => {
            if (file) {
              const type = mime.lookup(name) ?? 'application/octet-stream';
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
      const missing: string[] = await Readable.from(Object.entries(files))
        .map(
          async ([fileName, url]) => {
            const stream = await cache.get(url);
            if (!stream) {
              return fileName;
            }

            const source = await buffer(stream);
            this.emitFile({ type: 'asset', fileName, source });
          },
          { concurrency: concurrency ?? DEFAULT_CONCURRENCY },
        )
        .filter(Boolean)
        .toArray();

      if (missing.length) {
        this.error(`wget: 404 Not Found: ${missing.sort().join(', ')}`);
      }
    },
  };
}
