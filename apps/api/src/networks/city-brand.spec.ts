import { describe, it, expect } from "vitest";
import { CITY_NETWORKS, CITY_BRAND, cityBrand } from "./city-networks";
describe("owned city brand", () => {
  it("uses B2B Matching branding for every city without mutating records", () => {
    for (const city of CITY_NETWORKS) {
      const old = {
        slug: city.slug,
        primaryColor: "#ff0000",
        secondaryColor: "#110000",
        logoUrl: "old-logo",
      };
      expect(cityBrand(old)).toEqual({ ...old, ...CITY_BRAND });
      expect(old.primaryColor).toBe("#ff0000");
    }
  });
  it("keeps independent networks unchanged, including red sports brands", () => {
    for (const slug of [
      "bayer04leverkusen",
      "bayer-giants",
      "unternehmerfreunde",
      "private-club",
    ]) {
      const brand = {
        slug,
        primaryColor: "#ff0000",
        secondaryColor: "#111111",
        logoUrl: "logo",
      };
      expect(cityBrand(brand)).toBe(brand);
    }
  });
});
