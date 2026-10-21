import { describe, it, expect } from "vitest";
import { partnerHero, partnerSections } from "./partner-onepager";
describe("onepager content boundaries", () => {
  it("accepts empty or multiple plain-text sections but rejects malformed and oversized sections", () => {
    expect(partnerSections([])).toEqual([]);
    expect(partnerSections([{ title: " Titel ", body: " Text " }])).toEqual([
      { title: "Titel", body: "Text" },
    ]);
    for (const value of [
      null,
      {},
      Array(31).fill({ title: "t", body: "b" }),
      [{ title: "t", body: "x".repeat(3001) }],
    ])
      expect(() => partnerSections(value)).toThrow();
  });
  it("supports removing a hero and rejects external, SVG and oversized data", () => {
    expect(partnerHero(null)).toBeNull();
    for (const value of [
      "https://example.de/hero.png",
      "data:image/svg+xml;base64,YWJj",
      "data:image/png;base64," + "A".repeat(2000000),
    ])
      expect(() => partnerHero(value)).toThrow();
  });
});
