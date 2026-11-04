export function parseMailingCsv(text: string) {
  if (text.length > 1_000_000)
    throw new Error("Bitte maximal 1 MB pro CSV-Datei importieren.");
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0];
  const delimiter =
    (first.match(/;/g) || []).length > (first.match(/,/g) || []).length
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (quoted)
    throw new Error(
      "Die CSV-Datei enthält ein nicht geschlossenes Anführungszeichen.",
    );
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map((s) =>
    s.toLowerCase().replace(/[\s_-]/g, ""),
  );
  const find = (...keys: string[]) =>
    headers.findIndex((h) => keys.includes(h));
  const email = find("email", "emailadresse", "mail");
  if (email < 0)
    throw new Error("Die CSV-Datei benötigt eine Spalte E-Mail oder email.");
  if (!rows.length || rows.length > 500)
    throw new Error("Bitte 1 bis 500 Kontakte pro Datei importieren.");
  const firstName = find("vorname", "firstname"),
    lastName = find("nachname", "lastname"),
    company = find("firma", "unternehmen", "company");
  return rows.map((r) => ({
    email: r[email] || "",
    firstName: r[firstName] || "",
    lastName: r[lastName] || "",
    company: r[company] || "",
  }));
}
