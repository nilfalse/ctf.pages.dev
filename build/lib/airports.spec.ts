import { pipeline } from 'node:stream/promises';

import { parse } from 'csv-parse';
import { describe, expect, it } from 'vitest';

import { WebCache } from './WebCache.ts';
import * as airports from './airports.ts';

/** Same directory as the Vite plugin, so a test run warms the cache for the build. */
const cache = new WebCache(
  new URL('../../node_modules/.vite/airports', import.meta.url).pathname,
);

async function csv() {
  const stream = await cache.get(airports.URL);
  if (!stream) {
    throw new Error(`${airports.URL}: 404 Not Found`);
  }
  return stream;
}

describe('airports CSV', () => {
  it('should have every iso_region start with its iso_country', async () =>
    expect(
      await pipeline(await csv(), parse({ columns: true, bom: true }), (rows) =>
        rows
          .filter(
            (row: Record<string, string>) =>
              !row['iso_region']!.startsWith(`${row['iso_country']}-`),
          )
          .toArray(),
      ),
    ).toEqual([]));

  /** OurAirports' placeholder for "no subdivision", e.g. `IM-U-A`; iataCodes() drops these. */
  it('should match the snapshot of large airports with an unassigned region', async () =>
    expect(
      await pipeline(await csv(), parse({ columns: true, bom: true }), (rows) =>
        rows
          .filter(
            (row: Record<string, string>) =>
              row['type'] === 'large_airport' &&
              !!row['iata_code'] &&
              row['iso_region'] === `${row['iso_country']}-U-A`,
          )
          .map((row: Record<string, string>) => [
            row['iata_code'],
            `${row['iso_region']} ${row['name']}`,
          ])
          .toArray()
          .then(Object.fromEntries),
      ),
    ).toMatchSnapshot());
});

describe('iataCodes()', () => {
  it('should list Ukrainian airports', async () =>
    expect(
      Object.fromEntries(
        Object.entries(await airports.iataCodes(await csv())).filter(
          ([, { country }]) => country === 'UA',
        ),
      ),
    ).toEqual({
      KBP: { country: 'UA', region: '32' },
      LWO: { country: 'UA', region: '46' },
      ODS: { country: 'UA', region: '51' },
      SIP: { country: 'UA', region: '43' },
    }));
});
