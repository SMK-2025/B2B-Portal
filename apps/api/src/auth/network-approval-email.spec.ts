import { it, expect, vi } from "vitest";
import { EmailService } from "./email.service";
it("sends the branded sign-in URL in both versions of an approval email", async () => {
  vi.stubEnv("PUBLIC_WEB_URL", "https://b2b-matching.de");
  try {
    const service = new EmailService();
    const send = vi
      .spyOn(
        service as unknown as {
          send(m: { text: string; html: string }): Promise<void>;
        },
        "send",
      )
      .mockResolvedValue();
    await service.sendNetworkAccessGranted({
      email: "test@example.invalid",
      networkName: "Testnetzwerk",
      networkSlug: "bayer04leverkusen",
    });
    const m = send.mock.calls[0][0];
    const url =
      "https://b2b-matching.de/registrieren?network=bayer04leverkusen&mode=login";
    expect(m.text).toContain(url);
    expect(m.html).toContain('href="' + url.replace("&", "&amp;") + '"');
  } finally {
    vi.unstubAllEnvs();
  }
});
