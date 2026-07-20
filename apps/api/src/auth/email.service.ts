import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  directLinksEnabled(): boolean {
    return (
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_DIRECT_EMAIL_LINKS === "true"
    );
  }

  async sendVerification(input: {
    email: string;
    firstName: string;
    token: string;
  }): Promise<void> {
    const link = `${this.webUrl()}/email-bestaetigen?token=${encodeURIComponent(input.token)}`;
    await this.send({
      to: input.email,
      subject: "E-Mail-Adresse bei B2B Matching bestätigen",
      text: `Hallo ${input.firstName},\n\nbestätigen Sie Ihre geschäftliche E-Mail-Adresse:\n${link}\n\nDer Link ist 24 Stunden gültig.`,
      html: this.template(
        "Geschäftliche E-Mail bestätigen",
        `Hallo ${this.escape(input.firstName)}, bestätigen Sie bitte Ihre geschäftliche E-Mail-Adresse, um Ihr Konto zu aktivieren.`,
        "E-Mail-Adresse bestätigen",
        link,
        "Dieser Link ist 24 Stunden gültig.",
      ),
    });
  }

  async sendPasswordReset(input: {
    email: string;
    firstName: string;
    token: string;
  }): Promise<void> {
    const link = `${this.webUrl()}/passwort-zuruecksetzen?token=${encodeURIComponent(input.token)}`;
    await this.send({
      to: input.email,
      subject: "Passwort für B2B Matching zurücksetzen",
      text: `Hallo ${input.firstName},\n\nvergeben Sie über diesen Link ein neues Passwort:\n${link}\n\nDer Link ist 60 Minuten gültig.`,
      html: this.template(
        "Passwort zurücksetzen",
        `Hallo ${this.escape(input.firstName)}, über den folgenden Link können Sie ein neues Passwort vergeben.`,
        "Neues Passwort vergeben",
        link,
        "Dieser Link ist 60 Minuten gültig. Falls Sie die Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.",
      ),
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.MAIL_FROM_EMAIL;
    const fromName = process.env.MAIL_FROM_NAME ?? "B2B Matching";
    if (!apiKey || !fromEmail) {
      if (this.directLinksEnabled()) {
        this.logger.warn(
          "Mailversand ist nicht konfiguriert; direkter Testlink bleibt aktiv.",
        );
        return;
      }
      throw new ServiceUnavailableException(
        "Der E-Mail-Versand ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.",
      );
    }
    const apiBaseUrl = (
      process.env.SENDGRID_API_BASE_URL ?? "https://api.sendgrid.com"
    ).replace(/\/$/, "");
    const response = await fetch(`${apiBaseUrl}/v3/mail/send`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: fromEmail, name: fromName },
        subject: message.subject,
        content: [
          { type: "text/plain", value: message.text },
          { type: "text/html", value: message.html },
        ],
        ...(process.env.MAIL_REPLY_TO
          ? { reply_to: { email: process.env.MAIL_REPLY_TO } }
          : {}),
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      this.logger.error(
        `E-Mail-Versand fehlgeschlagen (${response.status}): ${detail}`,
      );
      throw new ServiceUnavailableException(
        "Die E-Mail konnte momentan nicht versendet werden. Bitte versuchen Sie es später erneut.",
      );
    }
  }

  private webUrl(): string {
    return (
      process.env.PUBLIC_WEB_URL ??
      process.env.WEB_ORIGIN ??
      process.env.WEB_ORIGINS?.split(",")[0]?.trim() ??
      "http://localhost:3000"
    ).replace(/\/$/, "");
  }

  private template(
    title: string,
    intro: string,
    button: string,
    link: string,
    note: string,
  ): string {
    return `<!doctype html><html lang="de"><body style="margin:0;background:#f3f7f6;font-family:Arial,sans-serif;color:#102f46"><div style="max-width:620px;margin:0 auto;padding:32px 18px"><div style="background:linear-gradient(135deg,#0d3148,#078d84);padding:28px;border-radius:18px 18px 0 0;color:#fff"><strong style="font-size:22px">B2B Matching</strong></div><div style="background:#fff;padding:34px 28px;border-radius:0 0 18px 18px"><h1 style="font-size:28px;margin:0 0 18px">${this.escape(title)}</h1><p style="font-size:17px;line-height:1.6">${intro}</p><p style="margin:28px 0"><a href="${this.escape(link)}" style="display:inline-block;background:#078d84;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:9px">${this.escape(button)}</a></p><p style="font-size:14px;line-height:1.6;color:#607786">${this.escape(note)}</p><p style="font-size:13px;line-height:1.5;color:#607786;word-break:break-all">Falls die Schaltfläche nicht funktioniert:<br>${this.escape(link)}</p></div></div></body></html>`;
  }

  private escape(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character]!,
    );
  }
}
