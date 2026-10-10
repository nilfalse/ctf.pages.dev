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
  const [{ localeDisplayNames }] = Object.values(cldr.default.main);

  const list: Record<string, string> = {};
  for (const [code, name] of Object.entries(localeDisplayNames.territories)) {
    if (/^[A-Z]{2}$/.test(code) && !SKIP.has(code)) {
      list[code] = name;
    }
  }

  return list as Territories;
}
