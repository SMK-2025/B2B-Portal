import type { NetworkRecord } from "../core/domain";

// One catalog for API, administration, navigation and dashboard. Omitted values
// preserve the existing experience; a switch never changes billing or deletes data.
export const NETWORK_FEATURES = [
  {
    id: "profiles",
    name: "Mitglieder & Unternehmensseiten",
    description:
      "Unternehmen entdecken und eigene Unternehmensseiten gestalten.",
  },
  {
    id: "chat",
    name: "Mitglieder-Chat",
    description:
      "Private Nachrichten und Dateien zwischen Mitgliedern austauschen.",
  },
  {
    id: "connections",
    name: "Vernetzungsanfragen",
    description:
      "Interesse an einer Vernetzung senden und Anfragen beantworten.",
    requires: "profiles",
  },
  {
    id: "board",
    name: "Schwarzes Brett",
    description:
      "Neuigkeiten, neue Mitglieder und freigegebene Kooperationen anzeigen.",
  },
  {
    id: "events",
    name: "Veranstaltungen",
    description: "Treffen veröffentlichen und Teilnahmen verwalten.",
  },
  {
    id: "recaps",
    name: "Veranstaltungsrückblicke",
    description: "Bilder und Rückblicke vergangener Treffen bereitstellen.",
    requires: "events",
  },
  {
    id: "pulse",
    name: "Netzwerk-Puls",
    description:
      "Gemeinsam freigegebene Gesprächs- und Kooperationsstatus im Dashboard anzeigen.",
    requires: "chat",
  },
  {
    id: "cooperationRevenue",
    name: "Umsatzanzeige im Hero",
    description:
      "Die Summe der von Mitgliedern freigegebenen Kooperationsumsätze anzeigen.",
    requires: "chat",
  },
  {
    id: "referrals",
    name: "Netzwerk empfehlen",
    description: "Persönliche Empfehlungslinks und Einladungen anbieten.",
  },
  {
    id: "offers",
    name: "Angebote & Gesuche",
    description: "Angebote und Gesuche auf Unternehmensseiten veröffentlichen.",
    requires: "profiles",
  },
  {
    id: "documents",
    name: "Unternehmensunterlagen",
    description:
      "Präsentationen und Dokumente auf Unternehmensseiten bereitstellen.",
    requires: "profiles",
  },
  {
    id: "pagePilot",
    name: "PagePilot AI",
    description:
      "Unternehmensseiten aus der eigenen Homepage vorbereiten lassen.",
    requires: "profiles",
  },
  {
    id: "analytics",
    name: "Auswertungen",
    description:
      "Der Netzwerkleitung Übersichten zu Mitgliedern und Netzwerkaktivitäten bereitstellen.",
  },
  {
    id: "publicHomepage",
    name: "Öffentliche Homepage-Anbindung",
    description:
      "Nur ausdrücklich freigegebene Profile, Veranstaltungen und Rückblicke an eine angebundene Homepage ausliefern.",
  },
  {
    id: "sports",
    name: "Sport & Spieltage",
    description:
      "Spielplan, Ergebnisse, Tabelle und Spieltagsdiskussionen für den ausgewählten Verein anzeigen.",
  },
] as const;
export type NetworkFeature = (typeof NETWORK_FEATURES)[number]["id"];
type FeatureNetwork = Pick<NetworkRecord, "slug" | "settings">;
export function featureEnabled(
  network: FeatureNetwork,
  key: NetworkFeature,
): boolean {
  const configured = network.settings?.features?.[key];
  const enabled =
    configured ??
    (key === "sports"
      ? ["bayer04leverkusen", "bayer-giants"].includes(network.slug)
      : key === "publicHomepage"
        ? network.slug === "unternehmerfreunde"
        : true);
  const definition = NETWORK_FEATURES.find((item) => item.id === key)!;
  return (
    enabled &&
    (!("requires" in definition) ||
      featureEnabled(network, definition.requires))
  );
}
export function networkFeatures(
  network: FeatureNetwork,
): Record<NetworkFeature, boolean> {
  return Object.fromEntries(
    NETWORK_FEATURES.map((item) => [item.id, featureEnabled(network, item.id)]),
  ) as Record<NetworkFeature, boolean>;
}
export const MODULE_FEATURES: Record<string, NetworkFeature> = {
  profiles: "profiles",
  members: "profiles",
  communication: "chat",
  community: "board",
  events: "events",
  services: "offers",
  documents: "documents",
  analytics: "analytics",
};
export const PAGE_FEATURES: Record<string, NetworkFeature> = {
  mitglieder: "profiles",
  profil: "profiles",
  kommunikation: "chat",
  themen: "board",
  veranstaltungen: "events",
  rueckblicke: "recaps",
  spielplan: "sports",
  auswertungen: "analytics",
  veroeffentlichungen: "publicHomepage",
};
