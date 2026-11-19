/*
 * Copyright 2026 nilfalse.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

const FILE_NAME = 'datasets/edges.json';

export default function plugin(): Plugin {
  const file = fileURLToPath(import.meta.resolve('edges'));

  return {
    name: 'edges',

    configureServer(server) {
      server.middlewares.use(server.config.base + FILE_NAME, (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        createReadStream(file).pipe(res);
      });
    },

    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: FILE_NAME,
        source: await readFile(file),
      });
    },
  };
}
