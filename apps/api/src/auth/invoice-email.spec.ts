import { describe, it, expect, vi, afterEach } from "vitest";
import { EmailService } from "./email.service";
describe("invoice email delivery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it("sends the same invoice attachment to the member and hidden operator copy", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "test-key");
    vi.stubEnv("MAIL_FROM_EMAIL", "sender@example.test");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await new EmailService().sendInvoice(
      "member@example.test",
      "B2B-0000001",
      "2027-01-30",
      new Uint8Array([1, 2, 3]),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.personalizations).toEqual([
      {
        to: [{ email: "member@example.test" }],
        bcc: [{ email: "mk@media-online-innovations.group" }],
      },
    ]);
    expect(body.attachments[0]).toMatchObject({
      filename: "B2B-0000001.pdf",
      content: "AQID",
      type: "application/pdf",
    });
    expect(body.subject).not.toMatch(/Bayer|Verein|Muster|Vorlage/);
  });
  it("does not silently report a sent invoice when the provider is absent", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "");
    await expect(
      new EmailService().sendInvoice(
        "member@example.test",
        "B2B-0000001",
        "2027-01-30",
        new Uint8Array(),
      ),
    ).rejects.toThrow(/nicht konfiguriert/);
  });
});
