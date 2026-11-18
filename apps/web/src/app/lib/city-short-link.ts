export function normalizeCityPath(value: string) {
  return value.toLocaleLowerCase("de-DE").trim()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[()]/g, "").replace(/\s+/g, "-");
}

export function cityLinkDestination(route: string, search: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  return route + (query.size ? `?${query}` : "");
}
