import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  directLinksEnabled(): boolean {
    return process.env.NODE_ENV !== "production";
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
        "Ihre Registrierung",
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

  async sendNetworkInvitation(input: { email: string; networkName: string; networkSlug: string; inviteToken: string }): Promise<void> {
    const link = `${this.webUrl()}/registrieren?network=${encodeURIComponent(input.networkSlug)}&email=${encodeURIComponent(input.email)}&invite=${encodeURIComponent(input.inviteToken)}`;
    await this.send({
      to: input.email,
      subject: `Einladung in das Netzwerk ${input.networkName}`,
      text: `Sie wurden in das geschlossene Unternehmensnetzwerk ${input.networkName} eingeladen.\n\nRegistrierung starten:\n${link}`,
      html: this.template(
        "Ihre Netzwerkeinladung",
        `Sie wurden eingeladen, dem geschlossenen Unternehmensnetzwerk <strong>${this.escape(input.networkName)}</strong> beizutreten.`,
        "Registrierung starten",
        link,
        "Die Aufnahme erfolgt nach Prüfung durch die Netzwerkverwaltung.",
      ),
    });
  }

  async sendTeamInvitation(input:{email:string;organizationName:string;inviterName:string;token:string}):Promise<void>{
    const link=`${this.webUrl()}/team-einladung?token=${encodeURIComponent(input.token)}`;
    await this.send({
      to:input.email,
      subject:`Einladung zum Unternehmenskonto ${input.organizationName}`,
      text:`${input.inviterName} hat Sie zum Unternehmenskonto ${input.organizationName} bei B2B Matching eingeladen.\n\nEinladung annehmen:\n${link}\n\nDer Link ist 14 Tage gültig.`,
      html:this.template("Ihre Teameinladung",`${this.escape(input.inviterName)} hat Sie eingeladen, im Unternehmenskonto <strong>${this.escape(input.organizationName)}</strong> mitzuarbeiten.`,"Einladung annehmen",link,"Dieser persönliche Link ist 14 Tage gültig und kann nur mit der eingeladenen E-Mail-Adresse verwendet werden."),
    });
  }

  async sendNetworkOrderConfirmation(input:{email:string;contact:string;networkName:string;orderId:string;billingCycle:"annual"|"semiannual"}):Promise<void>{
    const link=`${this.webUrl()}/portal`;
    const cycle=input.billingCycle==="annual"?"jährliche Vorauszahlung":"halbjährliche Abrechnung";
    await this.send({
      to:input.email,
      subject:`Eingangsbestätigung Ihrer Netzwerkportal-Bestellung ${input.orderId}`,
      text:`Hallo ${input.contact},\n\nwir bestätigen den Eingang Ihrer verbindlichen Bestellung für ${input.networkName}.\nBestellnummer: ${input.orderId}\nAbrechnung: ${cycle}\nNetzwerkpauschale: 390,00 EUR netto pro Monat\nEinmalige Einrichtung: 2.990,00 EUR netto\nMindestlaufzeit: 12 Monate\n\nDer Vertrag kommt entsprechend unseren AGB durch unsere Auftragsbestätigung zustande. Rechnung und Auftragsbestätigung folgen gesondert.`,
      html:this.template("Ihre verbindliche Bestellung",`Hallo ${this.escape(input.contact)}, wir bestätigen den Eingang Ihrer Bestellung für das Netzwerkportal <strong>${this.escape(input.networkName)}</strong>.<br><br><strong>Bestellnummer:</strong> ${this.escape(input.orderId)}<br><strong>Abrechnung:</strong> ${this.escape(cycle)}<br><strong>Netzwerkpauschale:</strong> 390,00 € netto pro Monat<br><strong>Einrichtung:</strong> 2.990,00 € netto einmalig<br><strong>Mindestlaufzeit:</strong> 12 Monate`,"Zum Portal",link,"Der Vertrag kommt entsprechend unseren AGB durch unsere gesonderte Auftragsbestätigung zustande. Rechnung und Auftragsbestätigung folgen separat."),
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
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
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
    const configured = (
      process.env.PUBLIC_WEB_URL ??
      process.env.WEB_ORIGIN ??
      process.env.WEB_ORIGINS?.split(",")[0]?.trim() ??
      ""
    ).replace(/\/$/, "");
    if (configured) return configured;
    if (process.env.NODE_ENV === "test") return "https://portal.test.invalid";
    if (process.env.NODE_ENV === "development") return "http://localhost:3000";
    throw new ServiceUnavailableException(
      "Die öffentliche Portaladresse ist nicht konfiguriert.",
    );
  }

  private template(
    title: string,
    intro: string,
    button: string,
    link: string,
    note: string,
  ): string {
    const webUrl = this.webUrl();
    const safeLink = this.escape(link);
    const safeTitle = this.escape(title);
    const logoUrl = `${webUrl}/images/b2b-matching-logo-brand.png`;
    return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${safeTitle} | B2B Matching</title>
</head>
<body style="margin:0;padding:0;background-color:#eef3f2;font-family:Arial,Helvetica,sans-serif;color:#102c42;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeTitle} bei B2B Matching</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#eef3f2;">
    <tr>
      <td align="center" style="padding:38px 14px;">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;">
          <tr>
            <td align="center" style="padding:0 24px 24px;">
              <a href="${this.escape(webUrl)}" style="text-decoration:none;">
                <img src="${this.escape(logoUrl)}" width="230" alt="B2B Matching" style="display:block;width:230px;max-width:75%;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 45px rgba(16,44,66,.12);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:25px 34px;background-color:#087f79;background-image:linear-gradient(120deg,#102c42 0%,#087f79 68%,#16a098 100%);">
                    <p style="margin:0 0 7px;color:#a8e2dc;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">B2B Matching</p>
                    <h1 style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:37px;font-weight:500;">${safeTitle}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 34px 30px;">
                    <p style="margin:0;color:#243e50;font-size:17px;line-height:28px;">${intro}</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 26px;">
                      <tr>
                        <td align="center" style="border-radius:9px;background-color:#078d84;">
                          <a href="${safeLink}" style="display:inline-block;padding:15px 23px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;border-radius:9px;">${this.escape(button)}</a>
                        </td>
                      </tr>
                    </table>
                    <div style="height:1px;background-color:#e1e9e7;margin:0 0 22px;"></div>
                    <p style="margin:0 0 17px;color:#607786;font-size:14px;line-height:22px;">${this.escape(note)}</p>
                    <p style="margin:0;color:#718692;font-size:12px;line-height:19px;">Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
                    <p style="margin:6px 0 0;font-size:12px;line-height:19px;word-break:break-all;"><a href="${safeLink}" style="color:#087f79;text-decoration:underline;">${safeLink}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 22px 0;color:#6b808c;font-size:11px;line-height:18px;">
              <p style="margin:0 0 7px;">Diese Nachricht wurde automatisch durch B2B Matching versendet.</p>
              <p style="margin:0;">Media Online Innovations Group · Inhaber Martin Kelm<br>Im Weidenblech 25 · 51371 Leverkusen</p>
              <p style="margin:9px 0 0;"><a href="${this.escape(webUrl)}/impressum" style="color:#087f79;">Impressum</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${this.escape(webUrl)}/datenschutz" style="color:#087f79;">Datenschutz</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
