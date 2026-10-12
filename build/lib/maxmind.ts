import path from 'node:path';
import { buffer } from 'node:stream/consumers';

import { parseTarGzip } from 'nanotar';

import type { WebCache } from './WebCache.ts';

export interface Env {
  MAXMIND_ACCOUNT_ID?: string;
  MAXMIND_LICENSE_KEY?: string;
}

const TARBALL_URL =
  'https://download.maxmind.com/geoip/databases/GeoLite2-Country/download?suffix=tar.gz';

/**
 * Files of the latest GeoLite2-Country release by name, plus `RELEASE.txt`
 * with its date. Requires credentials.
 */
export async function download(env: Env, cache: WebCache) {
  if (!env.MAXMIND_ACCOUNT_ID || !env.MAXMIND_LICENSE_KEY) {
    throw new Error('MAXMIND_ACCOUNT_ID and MAXMIND_LICENSE_KEY must be set');
  }
  const auth = `${env.MAXMIND_ACCOUNT_ID}:${env.MAXMIND_LICENSE_KEY}`;

  const response = await cache.get(TARBALL_URL, {
    headers: { Authorization: `Basic ${Buffer.from(auth).toString('base64')}` },
  });
  if (!response) {
    throw new Error(`${TARBALL_URL}: HTTP 404`);
  }

  const tarball = await parseTarGzip(await buffer(response));
  // The tarball's top-level directory is `GeoLite2-Country_<YYYYMMDD>/`.
  const date = /_(\d{8})\//.exec(tarball[0]?.name ?? '')?.[1];

  const files = tarball
    .filter((item) => item.type === 'file')
    .map((file) => [path.basename(file.name), file.data!] as const);
  files.push(['RELEASE.txt', Buffer.from(`${date}\n`)]);

  if (!date || !files.some(([name]) => name === 'GeoLite2-Country.mmdb')) {
    throw new Error(`${TARBALL_URL}: unexpected tarball layout`);
  }

  return files;
}
