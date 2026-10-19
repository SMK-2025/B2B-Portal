import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { OPERATOR_EMAIL } from "../core/operator-mail";
import { PortalStore } from "../core/portal.store";

@Injectable()
export class EmailService {
  constructor(@Optional() private readonly store?: PortalStore) {}
  private readonly logger = new Logger(EmailService.name);
  async sendOperatorInformation(subject: string, text: string) {
    if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM_EMAIL)
      throw new ServiceUnavailableException(
        "Betreiber-Mailversand nicht konfiguriert.",
      );
    const link = this.webUrl() + "/portal/admin/anmeldungen";
    await this.send({
      to: OPERATOR_EMAIL,
      subject,
      text: text + "\n\nVerwaltung: " + link,
      html: this.template(
        subject,
        this.escape(text).replace(/\n/g, "<br>"),
        "Zur Verwaltung",
        link,
        "Betreiberinformation. Dies ist keine Rechnung.",
      ),
    });
  }

  directLinksEnabled(): boolean {
    return process.env.NODE_ENV !== "production";
  }
  async sendEmailChange(input: {
    email: string;
    firstName: string;
    token: string;
    networkSlug?: string;
  }): Promise<void> {
    const link =
      this.webUrl() +
      "/konto-email-bestaetigen?token=" +
      encodeURIComponent(input.token) +
      (input.networkSlug
        ? "&network=" + encodeURIComponent(input.networkSlug)
        : "");
    await this.send({
      to: input.email,
      subject: "Neue Login-E-Mail-Adresse bestätigen",
      text:
        "Hallo " +
        input.firstName +
        ",\n\nbestätigen Sie Ihre neue Login-E-Mail-Adresse:\n" +
        link +
        "\n\nDer Link gilt 30 Minuten. Zusätzlich wird Ihr aktuelles Passwort benötigt. Ohne Bestätigung bleibt Ihre bisherige Adresse gültig.",
      html: this.template(
        "Neue Login-E-Mail bestätigen",
        "Bitte bestätigen Sie die Änderung Ihrer Login-Adresse. Ihre bisherige Adresse bleibt bis dahin gültig.",
        "Neue Adresse bestätigen",
        link,
        "30 Minuten gültig. Zur Bestätigung benötigen Sie auch Ihr aktuelles Passwort.",
      ),
    });
  }
  async sendAccountSecurityNotice(
    email: string,
    message: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: "Sicherheitshinweis zu Ihrem Partnerportal-Konto",
      text:
        message +
        "\n\nFalls Sie diese Änderung nicht veranlasst haben, wenden Sie sich umgehend an service@b2b-matching.de.",
      html: this.template(
        "Sicherheitshinweis zu Ihrem Konto",
        this.escape(message),
        "Zum Partnerportal",
        this.webUrl() + "/anmelden",
        "Falls Sie diese Änderung nicht veranlasst haben, wenden Sie sich umgehend an service@b2b-matching.de.",
      ),
    });
  }

  async sendVerification(input: {
    email: string;
    firstName: string;
    token: string;
    networkSlug?: string;
    networkInviteToken?: string;
  }): Promise<void> {
    const networkQuery = input.networkSlug
      ? `&network=${encodeURIComponent(input.networkSlug)}`
      : "";
    const inviteQuery = input.networkInviteToken
      ? `&invite=${encodeURIComponent(input.networkInviteToken)}`
      : "";
    const link = `${this.webUrl()}/email-bestaetigen?token=${encodeURIComponent(input.token)}${networkQuery}${inviteQuery}`;
    await this.send({
      to: input.email,
      subject: "E-Mail-Adresse für Ihr Partnerportal bestätigen",
      text: `Hallo ${input.firstName},\n\nbestätigen Sie Ihre geschäftliche E-Mail-Adresse:\n${link}\n\nDer Link ist 24 Stunden gültig.`,
      html: this.template(
        "Ihr Partnerportal-Zugang",
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

  async sendNetworkInvitation(input: {
    email: string;
    networkName: string;
    networkSlug: string;
    inviteToken: string;
  }): Promise<void> {
    const link = `${this.webUrl()}/registrieren?network=${encodeURIComponent(input.networkSlug)}&email=${encodeURIComponent(input.email)}&invite=${encodeURIComponent(input.inviteToken)}`;
    await this.send({
      to: input.email,
      subject: `Einladung in das Partnerportal ${input.networkName}`,
      text: `Sie wurden in das geschlossene Partnerportal ${input.networkName} eingeladen.\n\nRegistrierung starten:\n${link}`,
      html: this.template(
        "Ihre Netzwerkeinladung",
        `Sie wurden eingeladen, dem geschlossenen Partnerportal <strong>${this.escape(input.networkName)}</strong> beizutreten.`,
        "Registrierung starten",
        link,
        "Die Aufnahme erfolgt nach Prüfung durch die Netzwerkverwaltung.",
      ),
    });
  }

  async sendNetworkAccessGranted(input: {
    email: string;
    networkName: string;
    networkSlug: string;
  }): Promise<void> {
    const redirect = `/portal/netzwerk/${encodeURIComponent(input.networkSlug)}`;
    const link = `${this.webUrl()}/anmelden?redirect=${encodeURIComponent(redirect)}`;
    await this.send({
      to: input.email,
      subject: `Ihr Zugang zum Netzwerk ${input.networkName}`,
      text: `Ihr bestehendes B2B-Matching-Konto wurde für das geschlossene Unternehmensnetzwerk ${input.networkName} freigeschaltet.\n\nJetzt anmelden:\n${link}`,
      html: this.template(
        "Ihr Netzwerkzugang ist freigeschaltet",
        `Ihr bestehendes B2B-Matching-Konto wurde für das geschlossene Unternehmensnetzwerk <strong>${this.escape(input.networkName)}</strong> freigeschaltet.`,
        "Zum Netzwerk anmelden",
        link,
        "Melden Sie sich mit Ihrer bestehenden E-Mail-Adresse und Ihrem vorhandenen Passwort an.",
      ),
    });
  }

  async sendTeamInvitation(input: {
    email: string;
    organizationName: string;
    inviterName: string;
    token: string;
  }): Promise<void> {
    const link = `${this.webUrl()}/team-einladung?token=${encodeURIComponent(input.token)}`;
    await this.send({
      to: input.email,
      subject: `Einladung zum Unternehmenskonto ${input.organizationName}`,
      text: `${input.inviterName} hat Sie zum Unternehmenskonto ${input.organizationName} bei B2B Matching eingeladen.\n\nEinladung annehmen:\n${link}\n\nDer Link ist 14 Tage gültig.`,
      html: this.template(
        "Ihre Teameinladung",
        `${this.escape(input.inviterName)} hat Sie eingeladen, im Unternehmenskonto <strong>${this.escape(input.organizationName)}</strong> mitzuarbeiten.`,
        "Einladung annehmen",
        link,
        "Dieser persönliche Link ist 14 Tage gültig und kann nur mit der eingeladenen E-Mail-Adresse verwendet werden.",
      ),
    });
  }

  async sendNetworkOrderConfirmation(input: {
    email: string;
    contact: string;
    networkName: string;
    orderId: string;
    billingCycle: "annual";
    monthlyNetCents: number;
  }): Promise<void> {
    const link = `${this.webUrl()}/portal`;
    const cycle = "zwölf Monate im Voraus";
    const monthly = (input.monthlyNetCents / 100).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const annual = ((input.monthlyNetCents * 12) / 100).toLocaleString(
      "de-DE",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    );
    await this.send({
      to: input.email,
      subject: `Bestätigung Ihrer Netzwerk-Modulbuchung ${input.orderId}`,
      text: `Hallo ${input.contact},\n\nIhre verbindliche persönliche Modulbuchung für ${input.networkName} ist aktiv.\nBestellnummer: ${input.orderId}\nMonatlicher Preis: ${monthly} EUR netto\nAbrechnung: ${annual} EUR netto für zwölf Monate im Voraus\nMindestlaufzeit: 12 Monate\nZahlungsziel: 14 Tage nach Rechnungsstellung\nEinrichtungsgebühr: keine\n\nDie Rechnung folgt gesondert. Bei ausbleibender Zahlung kann der Portalbetreiber den Zugang sperren.`,
      html: this.template(
        "Ihre Modulbuchung ist aktiv",
        `Hallo ${this.escape(input.contact)}, Ihre verbindliche persönliche Modulbuchung für <strong>${this.escape(input.networkName)}</strong> ist aktiv.<br><br><strong>Bestellnummer:</strong> ${this.escape(input.orderId)}<br><strong>Monatlicher Preis:</strong> ${this.escape(monthly)} € netto<br><strong>Jahresbetrag:</strong> ${this.escape(annual)} € netto<br><strong>Abrechnung:</strong> ${this.escape(cycle)}<br><strong>Mindestlaufzeit:</strong> 12 Monate<br><strong>Zahlungsziel:</strong> 14 Tage nach Rechnungsstellung<br><strong>Einrichtungsgebühr:</strong> keine`,
        "Zum Netzwerkportal",
        link,
        "Die Rechnung folgt gesondert. Bei ausbleibender Zahlung kann der Portalbetreiber den Zugang sperren.",
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
      signal: AbortSignal.timeout(15_000),
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
    const url = new URL(link);
    const slug =
      url.searchParams.get("network") ||
      url.searchParams
        .get("redirect")
        ?.match(/\/portal\/netzwerk\/([^/]+)/)?.[1];
    const network =
      slug && this.store
        ? this.store.networks.get(this.store.networkBySlug.get(slug) || "")
        : undefined;
    const color = (value: string | undefined, fallback: string) =>
      value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
    const primary = color(network?.primaryColor, "#5158bf");
    const secondary = color(network?.secondaryColor, "#30284f");
    const logoUrl =
      network?.logoUrl && /^https:\/\//i.test(network.logoUrl)
        ? network.logoUrl
        : `${webUrl}/images/b2b-matching-logo-brand.png`;
    const brandName = this.escape(network?.name || "B2B Matching");
    const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${safeTitle} | B2B Matching</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f6fc;font-family:Arial,Helvetica,sans-serif;color:#30284f;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeTitle} bei B2B Matching</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f5f6fc;">
    <tr>
      <td align="center" style="padding:38px 14px;">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;">
          <tr>
            <td align="center" style="padding:0 24px 24px;">
              <a href="${this.escape(webUrl)}" style="text-decoration:none;">
                <img src="${this.escape(logoUrl)}" width="230" alt="${brandName}" style="display:block;width:230px;max-width:75%;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 45px rgba(16,44,66,.12);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td bgcolor="#30284f" style="padding:25px 34px;background-color:#30284f;background-image:linear-gradient(120deg,#30284f 0%,#5158bf 100%);">
                    <p style="margin:0 0 7px;color:#c7d9ff;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">B2B Matching · Partnerportal für Netzwerke</p>
                    <h1 style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:37px;font-weight:500;">${safeTitle}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 34px 30px;">
                    <p style="margin:0;color:#243e50;font-size:17px;line-height:28px;">${intro}</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td height="28" style="height:28px;line-height:28px;font-size:1px;">&nbsp;</td></tr></table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" valign="middle" bgcolor="#5158bf" style="border-radius:9px;background-color:#5158bf;padding:16px 28px;mso-padding-alt:16px 28px;">
                          <a href="${safeLink}" style="display:inline-block;color:#ffffff !important;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:700;text-align:center;mso-line-height-rule:exactly;"><font color="#ffffff"><span style="color:#ffffff !important;text-decoration:none;">${this.escape(button)}</span></font></a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td height="26" style="height:26px;line-height:26px;font-size:1px;">&nbsp;</td></tr></table>
                    <p style="margin:0 0 17px;color:#607786;font-size:14px;line-height:22px;">${this.escape(note)}</p>
                    <p style="margin:0;color:#718692;font-size:12px;line-height:19px;">Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
                    <p style="margin:6px 0 0;font-size:12px;line-height:19px;word-break:break-all;"><a href="${safeLink}" style="color:#5158bf;text-decoration:underline;">${safeLink}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 22px 0;color:#6b808c;font-size:11px;line-height:18px;">
              <p style="margin:0 0 7px;">Diese Nachricht wurde automatisch durch B2B Matching versendet.</p>
              <p style="margin:0;">Media Online Innovations Group · Inhaber Martin Kelm<br>Im Weidenblech 25 · 51371 Leverkusen</p>
              <p style="margin:9px 0 0;"><a href="${this.escape(webUrl)}/impressum" style="color:#5158bf;">Impressum</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${this.escape(webUrl)}/datenschutz" style="color:#5158bf;">Datenschutz</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    return html
      .replaceAll("#5158bf", primary)
      .replaceAll("#30284f", secondary)
      .replace(
        "B2B Matching · Partnerportal für Netzwerke",
        `${brandName} · Partnerportal`,
      );
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
