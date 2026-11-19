/*
 * Copyright 2026 nilfalse.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export type Territories = Record<TwoUppercaseLetters, string>;

/** Every locale file has this shape; `en` is only used to derive the type. */
type Cldr = typeof import('cldr-localenames-full/main/en/territories.json');

const SKIP = new Set(['EZ', 'QO', 'XA', 'XB']);

/** All CLDR two-letter territory codes with their names in the given locale. */
export async function territories(locale = 'en') {
  const cldr: { default: Cldr } = await import(
    `cldr-localenames-full/main/${locale}/territories.json`,
    { with: { type: 'json' } }
  );
  const [names] = Object.values(cldr.default.main);
  if (!names) {
    throw new Error(`No CLDR territory names for ${locale}`);
  }

  const list: Record<string, string> = {};
  for (const [code, name] of Object.entries(
    names.localeDisplayNames.territories,
  )) {
    if (/^[A-Z]{2}$/.test(code) && !SKIP.has(code)) {
      list[code] = name;
    }
  }

  return list as Territories;
}

const REGIONAL_INDICATOR_OFFSET =
  '\u{1F1E6}'.codePointAt(0)! - 'A'.charCodeAt(0);

export function codepoints(iso: TwoUppercaseLetters) {
  return Array.from(
    iso,
    (char: string) => REGIONAL_INDICATOR_OFFSET + char.charCodeAt(0),
  );
}
