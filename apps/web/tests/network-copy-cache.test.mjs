import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("offline worker never intercepts portal, branded login or API responses", () => {
  const handlers = {};
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; }, location: { origin: "https://b2b-matching.de" } },
    URL,
  });
  for (const url of [
    "https://b2b-matching.de/portal/netzwerk/alpha",
    "https://b2b-matching.de/registrieren?network=alpha",
    "https://b2b-matching.de/api/networks/admin/alpha/texts",
    "https://api.example.de/api/networks/branding/alpha/texts",
    "https://b2b-matching.de/_next/static/chunks/new-build.js",
  ]) {
    let intercepted = false;
    handlers.fetch({ request: { method: "GET", url }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, url);
  }
});
