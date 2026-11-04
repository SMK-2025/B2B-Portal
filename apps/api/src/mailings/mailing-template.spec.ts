import { describe, expect, it } from "vitest";
import {
  cityFromNetwork,
  personalizeMail,
  renderMailingTemplate,
  STORY_BODY,
} from "./mailing-template";
describe("personal letter template", () => {
  it("handles complete, partial and absent names without leftover placeholders", () => {
    expect(
      personalizeMail("Guten Tag {{firstName}} {{lastName}},", {
        firstName: "Ada",
        lastName: "Beispiel",
      }),
    ).toBe("Guten Tag Ada Beispiel,");
    expect(
      personalizeMail("Guten Tag {{firstName}} {{lastName}},", {
        firstName: "Ada",
      }),
    ).toBe("Guten Tag Ada,");
    expect(personalizeMail("Guten Tag {{firstName}} {{lastName}},", {})).toBe(
      "Guten Tag,",
    );
    expect(cityFromNetwork("Unternehmernetzwerk Köln")).toBe("Köln");
    expect(cityFromNetwork("Unternehmernetzwerk-Leverkusen")).toBe(
      "Leverkusen",
    );
    expect(cityFromNetwork("Bayer Giants")).toBe("");
  });
  it("escapes content, permits only bold emphasis and keeps accessible branding", () => {
    const html = renderMailingTemplate({
      body: STORY_BODY + "\n\n**<img src=x onerror=alert(1)>**",
      networkName: "Test <script>",
      color: "#ffff00",
      logo: "https://example.de/logo.png",
      web: "https://example.de",
      links: {
        landing: "https://example.de/Stadt",
        register: "https://example.de/registrieren?network=test",
        homepage: "https://example.de/",
      },
      unsubscribe: "https://example.de/unsubscribe",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
    expect(html).toContain('<strong style="font-weight:600">');
    expect(html).toContain("color:#111111");
    expect(html).toContain("max-width:620px");
    expect(html).not.toContain("/public/image/");
  });
});
