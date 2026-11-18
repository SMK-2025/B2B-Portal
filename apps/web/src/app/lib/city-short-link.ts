export function normalizeCityPath(value: string) {
  return value
    .toLocaleLowerCase("de-DE")
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[()]/g, "")
    .replace(/\s+/g, "-");
}
