import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MARKETING_PAGES,
  MARKETING_NAV,
  marketingPage,
  marketingHref,
} from "../src/app/lib/marketing-pages.ts";
test("eight distinct information pages have their own real paths and content", () => {
  assert.equal(Object.keys(MARKETING_PAGES).length, 8);
  const titles = new Set();
  for (const [key, page] of Object.entries(MARKETING_PAGES)) {
    assert.equal(marketingPage(key), key);
    assert.equal(marketingHref("/entwurf-manus", key), "/entwurf-manus/" + key);
    assert.ok(page.description.length > 80);
    titles.add(page.title);
  }
  assert.equal(titles.size, 8);
  assert.equal(marketingPage("unbekannt"), null);
  assert.equal(marketingPage("__proto__"), null);
});
test("navigation and footer lead to pages instead of the old homepage anchors", () => {
  const main = readFileSync(
    new URL("../src/app/components/city-marketing.tsx", import.meta.url),
    "utf8",
  );
  const footer = readFileSync(
    new URL("../src/app/components/marketing-footer.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(MARKETING_NAV.length, 6);
  for (const source of [main, footer])
    assert.doesNotMatch(
      source,
      /\$\{prefix\}#(?:netzwerke|vorteile|moeglichkeiten|fragen)/,
    );
  assert.match(main, /MARKETING_NAV\.map/);
  assert.match(main, /aria-current/);
  const router = readFileSync(
    new URL("../src/app/entwurf-manus/[[...stadt]]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(router, /MarketingInfoPage/);
  assert.match(router, /generateMetadata/);
  assert.match(router, /notFound\(\)/);
  assert.match(router, /index:\s*false/);
});
