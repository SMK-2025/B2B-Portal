import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const json = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("homepage backgrounds crossfade only after the incoming image has loaded", () => {
  const source=readFileSync(new URL('../src/app/components/city-marketing.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/app/components/city-marketing.css',import.meta.url),'utf8');
  assert.match(source,/function HeroBackdrop/);
  assert.match(source,/onLoad=\{\(\) => \{[\s\S]*?layer.key !== photo.key[\s\S]*?setActive\(i\)/);
  assert.match(source,/HeroBackdrop photo=\{selected\}/);
  assert.match(css,/transition: opacity 1\.4s ease-in-out/);
  assert.match(css,/\.cm-hero-image-layer\.is-visible \{ opacity: 1/);
});

test("hero city ticker links every network independently of six rotating backgrounds", () => {
  const source=readFileSync(new URL('../src/app/components/city-marketing.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/app/components/city-marketing.css',import.meta.url),'utf8');
  assert.match(source,/CITY_NETWORKS\.map\(\(network\)/);
  assert.ok(source.includes('href={`${prefix}${network.route}` as never}'));
  assert.match(source,/prefetch=\{false\}/);
  assert.match(source,/aria-hidden=\{copy === 1/);
  assert.match(source,/tabIndex=\{copy === 1 \? -1/);
  const keys=source.match(/const HERO_PHOTO_KEYS = (\[[^;]+\]);/)[1];
  const selected=JSON.parse(keys);
  assert.equal(selected.length,6);
  for(const key of selected)assert.ok(json('../src/app/lib/city-photos.json').some(p=>p.key===key));
  assert.match(source,/% HERO_PHOTO_KEYS\.length/);
  assert.match(css,/cm-city-ticker:hover/);
  assert.match(css,/cm-city-ticker:focus-within/);
  assert.match(css,/\.cityMarketing \.cm-hero \.cm-city-ticker\s*\{\s*display: block/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});

test("homepage hero uses approved copy and the own-network CTA has its matching destination", () => {
  const source = readFileSync(new URL("../src/app/components/city-marketing.tsx", import.meta.url), "utf8");
  for (const text of ["Ein Portal. 50 Stadtnetzwerke. Viele Möglichkeiten.", "Vernetzen Sie sich.", "Regional oder bundesweit.", "Unternehmernetzwerke, Vereinsnetzwerke und Wirtschaftsnetzwerke – auf einer Plattform.", "Lernen Sie Unternehmen kennen, knüpfen Sie neue Geschäftskontakte und tauschen Sie sich direkt mit anderen Mitgliedern aus.", "Was ist Ihnen ein guter Kontakt wert?", "Ihr Stadtnetzwerk ab 9,90 € netto pro Monat – entdecken Sie jetzt Ihr Unternehmernetzwerk.", "Bei zwölf Monaten Laufzeit.", "Stadtnetzwerk entdecken", "Eigenes Netzwerk aufbauen"]) assert.ok(source.includes(text), text);
  assert.ok(!source.includes("Sie entscheiden, ob Sie mehr beitragen möchten"));
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
