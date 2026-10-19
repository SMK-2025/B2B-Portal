import { describe, expect, it } from "vitest";
import { EmailService } from "./email.service";
describe("email presentation", () => {
  it("uses current platform colors and table-cell button padding without legacy green", () => {
    const service = new EmailService();
    const html = (
      service as unknown as { template: (...args: string[]) => string }
    ).template(
      "Titel",
      "Inhalt",
      "Zur Verwaltung",
      "https://portal.test.invalid/portal/admin",
      "Hinweis",
    );
    expect(html).toContain('bgcolor="#5158bf"');
    expect(html).toContain("mso-padding-alt:16px 28px");
    expect(html).toContain('font color="#ffffff"');
    expect(html).toContain('color:#ffffff !important;text-decoration:none;">Zur Verwaltung</span>');
    expect(html).not.toMatch(/#087f79|#078d84|#eef3f2|#16a098/i);
    expect(html).toContain("b2b-matching-logo-brand.png");
  });
});
