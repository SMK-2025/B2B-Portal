export const STORY_SUBJECT =
  "Vielleicht sitzt Ihr nächster Geschäftskontakt nur drei Straßen weiter.";
export const STORY_BODY = `Liebe Unternehmerinnen und Unternehmer, liebe Freunde des guten Netzwerkens,

wie unkompliziert wünschen Sie sich Business-Netzwerken?

Auch zwischen geplanten und durchgetakteten Veranstaltungen, mitten im Arbeitsalltag. Immer dann, wenn Zeit fürs Netzwerken ist und es zeitlich zu Ihnen passt – nicht nach vorgegebenen Terminen. Nicht nur beim Business-Frühstück. Auch nicht nur auf einer After-Work-Party. Nein. Immer dann, wenn es ein konkretes Thema gibt, wenn Sie Angebote und Leistungen suchen, für die Sie ein Partnerunternehmen benötigen. Und wenn es mal wirklich eilt und ein Auftrag winkt, dann sollten Sie nicht erst suchen müssen, sondern Ihrem Kunden sagen können: „Kein Problem, kriegen wir hin.“

Dafür gibt es das {{networkName}}! Kernkompetenz: B2B-Matching. Online-Netzwerken, so einfach wie Kundenverträge unterschreiben. Registrieren, einloggen, Unternehmen, Leistungen und Angebote entdecken, Vernetzungsanfragen senden und den integrierten Mitglieder-Chat nutzen, um eine Nachricht zu schreiben. Vielleicht finden Sie genau die Unterstützung, die Sie gerade suchen – nur drei Straßen weiter. In wenigen Minuten zum neuen Kontakt. Hört sich zu gut an? Funktioniert auch genau so!

Mit Ihrer eigenen Unternehmensseite zeigen Sie, was Sie anbieten und wobei Sie anderen Unternehmen helfen können. Mit kurzen Stichpunkten werden Sie gefunden und Sie finden ebenso passende Unternehmen und deren Leistungen und Produkte. Im Unternehmer-Chat kommen Sie direkt miteinander ins Gespräch. Ob ein neuer Auftrag, eine gemeinsame Aktion oder ein hilfreicher Kontakt: Alles beginnt damit, voneinander zu wissen. Und mit einem kleinen Scan mit Ihrer Smartphone-Kamera speichern Sie den neuen Kontakt direkt ab.

Lernen Sie unser Netzwerk jetzt kennen und stellen Sie Ihre Mitgliedsanfrage. Nicht ganz kostenlos, denn wir bauen und betreiben das Portal, um Ihnen bei Ihren B2B-Themen weiterzuhelfen. {{launchOffer}}

Ach, und noch etwas: B2B-Matching.de ist so fortschrittlich entwickelt, dass Sie Ihre ganz persönliche Unternehmensseite auch vollautomatisiert mit unserer KI – der PagePilot AI – ohne Mühe in wenigen Augenblicken erstellen und aktivieren können.

Ich freue mich darauf, Sie und Ihr Unternehmen im Netzwerk kennenzulernen.

Viele Grüße
Martin Kelm
B2B-Matching.de
Ein Service der Media Online Innovations Group`;

export const escapeMail = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ]!,
  );
export const plainMail = (text: string) =>
  text.replace(/\*\*([^\n]+?)\*\*/g, "$1");

export function cityFromNetwork(name: string) {
  return (
    /^(?:Unternehmernetzwerk|Unternehmensnetzwerk|B2B-Netzwerk)[\s–-]+(.+)$/i
      .exec(name)?.[1]
      .trim() || ""
  );
}

export function personalizeMail(text: string, values: Record<string, string>) {
  return text
    .replace(
      /\{\{(firstName|lastName|company|networkName|city|launchOffer)\}\}/g,
      (_, key: string) => values[key] || "",
    )
    .replace(
      /^Guten Tag[^\S\r\n]*([^\r\n,]*),/m,
      (_, name: string) =>
        `Guten Tag${name.trim() ? " " + name.trim().replace(/\s+/g, " ") : ""},`,
    );
}

type TemplateInput = {
  body: string;
  networkName: string;
  color: string;
  logo: string;
  web: string;
  links: { landing: string; register: string; homepage: string };
  unsubscribe: string;
  pixel?: string;
};
export function renderMailingTemplate(input: TemplateInput) {
  const e = escapeMail,
    color = /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : "#5364d9";
  const rgb = color
    .slice(1)
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const onColor =
    rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
      ? "#111111"
      : "#ffffff";
  const paragraphs = input.body
    .split(/\r?\n\s*\r?\n/)
    .map(
      (p, i) =>
        `<p style="margin:0 0 22px;font-size:16px;line-height:1.75;color:${i === 1 ? "#20252b" : "#343b45"}">${e(
          p,
        )
          .replace(
            /\*\*([^\n]+?)\*\*/g,
            '<strong style="font-weight:600">$1</strong>',
          )
          .replace(/\r?\n/g, "<br>")}</p>`,
    )
    .join("");
  // Table-backed buttons keep their spacing and full click area in mail clients.
  // Square table cells avoid competing VML/CSS outlines in classic Outlook.
  const button = (label: string, href: string, secondary = false) => {
    const fill = secondary ? "#ffffff" : color;
    const ink = secondary ? color : onColor;
    return `<table role="presentation" width="320" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:320px;border-collapse:collapse;margin:0;mso-table-lspace:0pt;mso-table-rspace:0pt"><tr><td align="center" valign="middle" bgcolor="${fill}" style="padding:0;border:1px solid ${color};background:${fill};mso-padding-alt:16px;text-align:center"><a href="${e(href)}" style="display:block;margin:0;padding:16px;border:0;background:${fill};color:${ink}!important;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-align:center;text-decoration:none!important;line-height:18px;mso-line-height-rule:at-least;mso-padding-alt:0"><span style="color:${ink};text-decoration:none">${e(label)}</span></a></td></tr></table>`;
  };
  const actions = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:6px 0 28px"><tr><td align="left" style="padding:0">${button("Das Netzwerk kennenlernen →", input.links.landing)}</td></tr><tr><td height="12" style="height:12px;font-size:0;line-height:12px">&nbsp;</td></tr><tr><td align="left" style="padding:0">${button("Direkt zur Teilnahmeanfrage →", input.links.register, true)}</td></tr></table>`;
  const header = `<table role="presentation" class="mailHeaderTable" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;table-layout:fixed;border-collapse:collapse"><tr class="mailHeaderRow"><td class="mailHeaderLogo" width="150" valign="middle" style="width:150px;padding:0 0 24px"><img src="${e(input.logo)}" width="150" alt="B2B Matching" style="display:block;width:150px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none"></td><td class="mailHeaderName" align="right" valign="middle" style="padding:0 0 24px 22px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:28px;mso-line-height-rule:at-least;font-weight:bold;color:#283442;word-wrap:break-word;overflow-wrap:anywhere">${e(input.networkName)}</td></tr><tr><td colspan="2" height="26" style="height:26px;padding:0;border-top:1px solid #e5e7eb;font-size:0;line-height:26px">&nbsp;</td></tr></table>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><style type="text/css">@media only screen and (max-width:480px){.mailHeaderTable,.mailHeaderTable>tbody{display:block!important;width:100%!important}.mailHeaderRow{display:block!important;width:100%!important}.mailHeaderLogo,.mailHeaderName{display:block!important;width:100%!important}.mailHeaderLogo{padding-bottom:16px!important}.mailHeaderName{padding-left:0!important;padding-bottom:20px!important;font-size:20px!important;line-height:26px!important}}</style></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#343b45"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-top:3px solid ${color}"><tr><td style="padding:28px 24px 24px">${header}${paragraphs}${actions}<div style="border-top:1px solid #e5e7eb;padding-top:20px"><p style="margin:0 0 10px;color:#69717c;font-size:12px;line-height:1.7">Media Online Innovations Group · Inhaber Martin Kelm<br>Im Weidenblech 25 · 51371 Leverkusen<br><a href="${e(input.links.homepage)}" style="color:#69717c">B2B-Matching.de</a> · <a href="${e(input.web)}/impressum" style="color:#69717c">Impressum</a> · <a href="${e(input.web)}/datenschutz/unternehmen" style="color:#69717c">Datenschutz</a></p><p style="margin:0;font-size:12px;line-height:1.7"><a href="${e(input.unsubscribe)}" style="color:#69717c;text-decoration:underline">Keine weiteren Netzwerk-E-Mails erhalten</a></p>${input.pixel ? `<p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#69717c">Bei dieser Nachricht werden Bildabrufe, Linkaufrufe und die daraus zugeordnete Registrierung entsprechend Ihrer dokumentierten Freigabe ausgewertet.</p><img width="1" height="1" alt="" src="${e(input.pixel)}">` : ""}</div></td></tr></table></td></tr></table></body></html>`;
}
