import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { parse } from 'csv-parse';

export const URL =
  'https://github.com/datasets/airport-codes/raw/refs/heads/main/data/airport-codes.csv';

export interface Airport {
  country: string;
  region: string;
}

export async function iataCodes(csv: Readable) {
  type Row = Record<string, string>;

  const pairs = await pipeline(
    csv,
    parse({ columns: true, bom: true }),
    (rows) =>
      rows
        .filter(
          (row: Row) =>
            row['type'] === 'large_airport' &&
            /^[A-Z]{3}$/.test(row['iata_code']!) &&
            row['iso_region'] !== `${row['iso_country']}-U-A`,
        )
        .map(({ iata_code, iso_country, iso_region }: Row) => [
          iata_code,
          {
            country: iso_country,
            region: iso_region!.slice(iso_country!.length + 1),
          },
        ])
        .toArray() as Promise<[string, Airport][]>,
  );
  if (!pairs.length) {
    throw new Error('airports: no large airports found');
  }

  return Object.fromEntries(pairs);
}
