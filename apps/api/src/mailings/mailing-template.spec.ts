import { describe, expect, it } from "vitest";
import {
  cityFromNetwork,
  personalizeMail,
  renderMailingTemplate,
  STORY_BODY,
} from "./mailing-template";
describe("personal letter template", () => {
  it("uses a right-aligned network heading with a narrow-screen fallback", () => {
    const html = renderMailingTemplate({
      body: "Guten Tag,",
      networkName: "Unternehmernetzwerk Köln & Region",
      color: "#c8102e",
      logo: "https://example.de/logo.png",
      web: "https://example.de",
      links: {
        landing: "https://example.de/stadt",
        register: "https://example.de/register",
        homepage: "https://example.de",
      },
      unsubscribe: "https://example.de/unsubscribe",
    });
    expect(html).toContain(
      'class="mailHeaderName" align="right" valign="middle"',
    );
    expect(html).toContain("font-size:21px;line-height:28px");
    expect(html).toContain("table-layout:fixed");
    expect(html).toContain("max-width:480px");
    expect(html).toContain("Unternehmernetzwerk Köln &amp; Region");
    expect(html).toContain('alt="B2B Matching"');
  });
  it("renders two matching mail-safe buttons without changing tracked destinations", () => {
    const html = renderMailingTemplate({
      body: "Guten Tag,",
      networkName: "Köln",
      color: "#c8102e",
      logo: "https://example.de/logo.png",
      web: "https://example.de",
      links: {
        landing: "https://example.de/click/landing?token=a&kind=landing",
        register: "https://example.de/click/register?token=a&kind=register",
        homepage: "https://example.de/",
      },
      unsubscribe: "https://example.de/unsubscribe",
    });
    expect(html).toContain("max-width:320px");
    expect(html).not.toContain("border-radius");
    expect(html).not.toContain("v:roundrect");
    expect(html).not.toContain("mso-hide:all");
    expect(html).toContain('width="320"');
    expect(html).toContain("mso-padding-alt:16px");
    expect(html).toContain("padding:16px;border:0");
    expect(html).toContain('bgcolor="#c8102e"');
    expect(html).toContain('bgcolor="#ffffff"');
    expect(html).toContain("Das Netzwerk kennenlernen →");
    expect(html).toContain("Direkt zur Teilnahmeanfrage →");
    expect(html).toContain("token=a&amp;kind=landing");
    expect(html).toContain("token=a&amp;kind=register");
    expect(html).toContain('href="https://example.de/unsubscribe"');
    expect(html).toContain("Keine weiteren Netzwerk-E-Mails erhalten");
    expect(html).not.toContain("Keine weiteren Werbe-E-Mails erhalten");
  });
  it("starts the general template with the agreed networking greeting", () => {
    expect(STORY_BODY.split("\n")[0]).toBe(
      "Liebe Unternehmerinnen und Unternehmer, liebe Freunde des guten Netzwerkens,",
    );
  });
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
