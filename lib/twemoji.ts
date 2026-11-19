/*
 * Copyright 2026 nilfalse.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as country from './country.ts';

export function url(code: TwoUppercaseLetters, version = 'latest') {
  const codepoints = country
    .codepoints(code)
    .map((c) => c.toString(16))
    .join('-');

  return `https://jdecked.github.io/twemoji/v/${version}/svg/${codepoints}.svg`;
}
