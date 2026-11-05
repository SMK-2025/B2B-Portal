/** Shared interface copy only. Never copy network identity, welcome text,
 * branding, sports copy, articles or company/member content into another tenant. */
export const NETWORK_UI_COPY: Readonly<Record<string,string>> = {
  "ui.nav.kommunikation": "Mitglieder-Chat",
  "ui.heading.kommunikation": "Mitglieder-Chat",
  "ui.heading.mitglieder": "Mitgliederverzeichnis",
  "ui.intro.mitglieder": "Unternehmen finden, kennenlernen und gezielt miteinander in Kontakt bringen.",
  "ui.intro.veranstaltungen": "Entdecke die nächsten Treffen, erfahre alle Details und melde dich direkt an.",
  "ui.network-dashboard-workspace.cd5868c8b1bdae7a": "Mitglieder entdecken →",
  "ui.network-dashboard-workspace.9866dbd37e9587a8": "Alle Mitglieder entdecken →",
  "ui.partner-chat-workspace.d6163d6685bdad2a": "Wen möchten Sie kennenlernen?",
  "ui.partner-chat-workspace.8d26bdf52ad1867b": "Kontakt wählen. Nachricht senden.",
  "ui.partner-chat-workspace.a44de4fb1b1413ef": "Unternehmen anschreiben",
  "ui.network-members-workspace.c03a0ec43f30f32b": "Mitglieder-Chat beginnen →",
};

export function networkUiCopy<T>(id:string, overrides:Record<string,string>|undefined, fallback:T):string|T {
  return overrides?.[id] ?? NETWORK_UI_COPY[id] ?? fallback;
}
