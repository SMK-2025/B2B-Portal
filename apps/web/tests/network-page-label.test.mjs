import { test } from "node:test";
import assert from "node:assert/strict";
import { networkPageLabel } from "../src/app/lib/network-page-label.ts";

test("Bayer 04 page eyebrows identify the independently operated portal", () => {
  assert.equal(
    networkPageLabel("bayer04leverkusen", "Bayer 04 Leverkusen"),
    "B2B-Netzwerk-Portal",
  );
});

test("other network names remain unchanged", () => {
  assert.equal(
    networkPageLabel("bayer-giants", "Bayer Giants"),
    "BAYER GIANTS",
  );
  assert.equal(
    networkPageLabel("unternehmerfreunde-nrw", "Unternehmerfreunde NRW"),
    "UNTERNEHMERFREUNDE NRW",
  );
});
