import * as country from './country.ts';

export function url(code: TwoUppercaseLetters, version = 'latest') {
  const codepoints = country
    .codepoints(code)
    .map((c) => c.toString(16))
    .join('-');

  return `https://jdecked.github.io/twemoji/v/${version}/svg/${codepoints}.svg`;
}
