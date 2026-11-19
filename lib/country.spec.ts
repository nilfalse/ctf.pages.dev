/*
 * Copyright 2026 nilfalse.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { beforeAll, describe, expect, it } from 'vitest';

import * as country from './country.ts';

describe('codepoints()', () => {
  it('should map ISO code to regional indicator symbols', () =>
    expect(country.codepoints('UA')).toEqual([0x1f1fa, 0x1f1e6]));
});

describe('territories()', () => {
  let list: country.Territories;

  beforeAll(async () => {
    list = await country.territories('en');
  });

  it('should only contain two-letter codes', () =>
    expect(Object.keys(list).filter((c) => !/^[A-Z]{2}$/.test(c))).toEqual([]));

  it('should keep ZZ and drop codes without a flag', () => {
    expect(list).toHaveProperty('ZZ');
    for (const code of ['EZ', 'QO', 'XA', 'XB']) {
      expect(list).not.toHaveProperty(code);
    }
  });

  it('should load other locales', async () =>
    expect(await country.territories('da')).toHaveProperty('DK', 'Danmark'));

  it('should reject unknown locales', () =>
    expect(country.territories('../x')).rejects.toThrow(
      `Cannot find package 'cldr-localenames-full/main/../x/territories.json`,
    ));

  it('should match the snapshot of the CLDR dataset', () =>
    expect(list).toMatchSnapshot());
});
