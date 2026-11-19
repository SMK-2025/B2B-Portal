import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const json = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("homepage hero uses approved copy and the own-network CTA has its matching destination", () => {
  const source = readFileSync(new URL("../src/app/components/city-marketing.tsx", import.meta.url), "utf8");
  for (const text of ["Gemeinsam netzwerken. Mehr Kontakte gewinnen.", "Finden Sie Geschäftskontakte,", "die zu Ihrem Unternehmen passen.", "Für Ihre Stadt. Für Ihren Verein. Unter Ihrer eigenen Marke.", "Entdecken Sie Unternehmen, finden Sie passende Partner und kommen Sie direkt ins Gespräch.", "Eigenes Netzwerk aufbauen"]) assert.ok(source.includes(text), text);
  assert.match(source, /marketingHref\(prefix, "eigenes-portal"\)/);
  assert.ok(source.includes('city ? "Als Mitglied einloggen" : "Eigenes Netzwerk aufbauen"'));
  assert.ok(source.includes("Eine Stadt voller Unternehmen."));
});
test("every city has its own image and source credits", () => {
  const cities = json("../../api/src/networks/city-networks.json"),
    photos = json("../src/app/lib/city-photos.json");
  assert.equal(photos.length, 50);
  assert.equal(new Set(photos.map((p) => p.key)).size, 50);
  for (const city of cities) {
    const photo = photos.find((p) => p.key === city.key);
    assert.ok(photo, city.key);
    assert.match(photo.sourceUrl, /^https:/);
    assert.ok(photo.author);
    assert.match(photo.licenseUrl, /^https:/);
    readFileSync(new URL("../public" + photo.src, import.meta.url));
  }
});
test("preview remains noindex and links preserve real network-scoped registration", () => {
  const source = readFileSync(
    new URL("../src/app/components/city-marketing.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /registrieren\?network=\$\{city.slug\}/);
  assert.match(source, /anmelden\?network=\$\{city.slug\}/);
  assert.doesNotMatch(source, /19[,.]00|228[,.]00|271[,.]32/);
  const preview = readFileSync(
    new URL("../src/app/entwurf-manus/[[...stadt]]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(preview, /index:\s*false/);
});

test("image sources use a searchable native dialog below a complete legal footer",()=>{
  const footer=readFileSync(new URL('../src/app/components/marketing-footer.tsx',import.meta.url),'utf8');
  assert.match(footer,/<dialog/);assert.match(footer,/showModal\(\)/);assert.match(footer,/onCancel=/);assert.match(footer,/type="search"/);
  for(const path of ['/impressum','/agb','/datenschutz/unternehmen','/datenschutz/mailings','/cookies','/barrierefreiheit'])assert.ok(footer.includes(path),path);
  assert.match(footer,/<CookieSettingsButton/);assert.match(footer,/photo\.sourceUrl/);assert.match(footer,/photo\.licenseUrl/);assert.match(footer,/photo\.src/);
  const main=readFileSync(new URL('../src/app/components/city-marketing.tsx',import.meta.url),'utf8');assert.doesNotMatch(main,/<Credit|cm-credit/);assert.match(main,/<MarketingFooter/);
});
