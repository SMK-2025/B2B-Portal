"use client";

import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { Status } from "./portal-shell";
import { AdminNetworkUsers } from "./admin-network-users";
import { AdminNetworkShare } from "./admin-network-share";
import { AdminNetworkBilling } from "./admin-network-billing";
import { AdminNetworkActivity } from "./admin-network-activity";
import { LaunchPromotionSettings } from "./launch-promotion-settings";

type NetworkStatus = "draft" | "trial" | "active" | "suspended";
type Network = {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string | null;
  status: NetworkStatus;
  trialEndsAt: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  memberCount?: number;
  activitySummary?: { pendingCount: number; unreadCount: number };
  settings: {
    selfRegistration: boolean;
    billingMode?: "standard" | "cooperation_free";
    memberPaymentModel?: "individual" | "network";
  };
  administrator: {
    userId: string;
    user?: { firstName: string; lastName: string; email: string };
  } | null;
  centrallyFundedMembers?: number;
  administrators?: Array<{
    user?: { firstName: string; lastName: string; email: string };
  }>;
  latestOrder?: {
    id: string;
    status: "submitted" | "accepted" | "rejected" | "cancelled";
    submittedAt: string;
    invoiceCompany: string;
    invoiceContact: string;
    invoiceEmail: string;
    billingCycle: "annual";
    participantCount: number;
    selectedModules: string[];
    pricingMode: "individual" | "complete";
    monthlyNetCents: number;
  } | null;
};
type Dialog = "create" | "trial" | "admin" | null;
const labels: Record<NetworkStatus, string> = {
  draft: "Entwurf",
  trial: "Testzugang",
  active: "Aktiv",
  suspended: "Gesperrt",
};
export function AdminNetworkWorkspace() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selected, setSelected] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [trialDays, setTrialDays] = useState(30);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [testAccess, setTestAccess] = useState<Network | null>(null);
  const [query, setQuery] = useState("");

  async function refreshNetworks() {
    const token = getPortalSession();
    if (!token) return;
    try {
      setNetworks(await portalRequest<Network[]>("/networks/admin", { token }));
    } catch (error) {
      showError(error);
    }
  }

  useEffect(() => {
    const token = getPortalSession();
    if (!token) return;
    void refreshNetworks();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshNetworks();
    }, 45000);
    const onFocus = () => {
      void refreshNetworks();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  function showError(error: unknown) {
    setNotice(
      error instanceof Error
        ? error.message
        : "Die Anfrage konnte nicht verarbeitet werden.",
    );
  }
  function adminName(network: Network) {
    if (network.administrators?.length)
      return network.administrators
        .map((m) =>
          m.user ? `${m.user.firstName} ${m.user.lastName}` : "Unbekannt",
        )
        .join(", ");
    const user = network.administrator?.user;
    return user ? `${user.firstName} ${user.lastName}` : "Noch nicht vergeben";
  }
  function open(next: Exclude<Dialog, null>, id?: string) {
    if (id) setSelected(id);
    setDialog(next);
  }

  async function createNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token)
      return setNotice(
        "Bitte melden Sie sich zuerst als Plattformadministrator an.",
      );
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const created = await portalRequest<Network>("/networks", {
        token,
        body: {
          name: form.get("name"),
          slug: form.get("slug"),
          legalName: form.get("legalName"),
          websiteUrl: form.get("websiteUrl"),
          memberPaymentModel: form.get("memberPaymentModel"),
          launchPromotion: {enabled:form.get("launchEnabled")==="on",limit:Number(form.get("launchLimit")),freeMonths:Number(form.get("launchMonths"))},
          billing: {
            months: Number(form.get("billingMonths")),
            freeUntil: form.get("billingFreeUntil"),
            paidFrom: form.get("billingPaidFrom"),
            paidThrough: form.get("billingPaidThrough"),
            autoRenew: form.get("billingAutoRenew") === "on",
            renewalMonths: 12,
            automaticInvoices: form.get("billingAutoInvoices") === "on",
          },
          memberMonthlyNetCents: Math.round(
            Number(form.get("memberMonthlyPrice")) * 100,
          ),
        },
      });
      setNetworks((items) => [...items, created]);
      setDialog(null);
      setNotice(`${created.name} wurde als gesperrter Entwurf angelegt.`);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function updateAccess(status: NetworkStatus, days?: number) {
    const token = getPortalSession();
    if (!token)
      return setNotice(
        "Bitte melden Sie sich zuerst als Plattformadministrator an.",
      );
    setBusy(true);
    try {
      const updated = await portalRequest<Network>(
        `/networks/${selected}/access`,
        {
          token,
          body: {
            status,
            ...(days ? { trialDays: days } : {}),
            selfRegistration: false,
          },
        },
      );
      setNetworks((items) =>
        items.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setDialog(null);
      if (status === "trial") setTestAccess(updated);
      setNotice(
        status === "trial"
          ? `Testzugang für ${days} Tage wurde erteilt.`
          : status === "active"
            ? "Das Netzwerk wurde dauerhaft aktiviert."
            : "Das Netzwerk wurde gesperrt.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function appoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token)
      return setNotice(
        "Bitte melden Sie sich zuerst als Plattformadministrator an.",
      );
    const email = String(new FormData(event.currentTarget).get("email"));
    setBusy(true);
    try {
      const result = await portalRequest<{
        invited?: boolean;
        registrationRequired?: boolean;
      }>(`/networks/${selected}/administrator`, {
        token,
        body: { email },
      });
      const refreshed = await portalRequest<Network[]>("/networks/admin", {
        token,
      });
      setNetworks(refreshed);
      setDialog(null);
      setNotice(
        result.invited
          ? "Die persönliche Initiator-Einladung wurde versendet. Nach der Registrierung wird die Person automatisch Initiator und Netzwerkadministrator."
          : "Die Rolle Initiator / Netzwerkadministrator wurde verbindlich zugewiesen.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function deleteNetwork(network: Network) {
    const confirmation = window.prompt(
      `„${network.name}“ einschließlich aller Unternehmen, Benutzerkonten, E-Mail-Adressen, Anmeldedaten und Inhalte dauerhaft löschen? Die betroffenen Personen können sich anschließend neu registrieren. Geben Sie zur Bestätigung ${network.slug} ein:`,
    );
    if (confirmation !== network.slug) return;
    const token = getPortalSession();
    if (!token)
      return setNotice(
        "Bitte melden Sie sich erneut als Plattformadministrator an.",
      );
    setBusy(true);
    try {
      await portalRequest(`/networks/${network.id}/delete`, {
        token,
        body: { confirmSlug: confirmation },
      });
      setNetworks((items) => items.filter((item) => item.id !== network.id));
      setNotice(`${network.name} wurde vollständig gelöscht.`);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function activateCooperation(network: Network) {
    if (
      !window.confirm(
        `${network.name} jetzt dauerhaft als kostenfreie Kooperation aktivieren? Alle Netzwerkmodule stehen dann Initiator und eingeladenen Partnern ohne Buchung oder Rechnung zur Verfügung.`,
      )
    )
      return;
    const token = getPortalSession();
    if (!token)
      return setNotice(
        "Bitte melden Sie sich erneut als Plattformadministrator an.",
      );
    setBusy(true);
    try {
      const updated = await portalRequest<Network>(
        `/networks/${network.id}/access`,
        {
          token,
          body: {
            status: "active",
            billingMode: "cooperation_free",
            selfRegistration: false,
          },
        },
      );
      setNetworks((items) =>
        items.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setNotice(
        `${network.name} ist als kostenfreie Kooperation vollständig aktiviert.`,
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function decideOrder(
    network: Network,
    decision: "accepted" | "rejected",
  ) {
    const order = network.latestOrder;
    if (!order) return;
    const text =
      decision === "accepted"
        ? "Diese verbindliche Bestellung annehmen und das Netzwerk produktiv aktivieren?"
        : "Diese verbindliche Bestellung ablehnen?";
    if (!window.confirm(text)) return;
    const token = getPortalSession();
    if (!token)
      return setNotice(
        "Bitte melden Sie sich erneut als Plattformadministrator an.",
      );
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${network.id}/orders/${order.id}/decision`,
        { token, body: { decision } },
      );
      const refreshed = await portalRequest<Network[]>("/networks/admin", {
        token,
      });
      setNetworks(refreshed);
      setNotice(
        decision === "accepted"
          ? "Die Bestellung wurde angenommen und das Netzwerk aktiviert."
          : "Die Bestellung wurde abgelehnt.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminNetworkWorkspace">
      <section className="adminNetworkNotice">
        <b>Rollenhoheit beim Plattforminhaber</b>
        <p>
          Neue Partner starten immer als gesperrter Entwurf. Nur Sie vergeben
          Test- oder Dauerzugänge und ernennen Netzwerkadministratoren.
        </p>
      </section>
      <div className="adminNetworkToolbar">
        <div>
          <strong>{networks.length} Netzwerkpartner</strong>
          <span>
            {networks.filter((item) => item.status === "active").length} aktiv ·{" "}
            {networks.filter((item) => item.status === "trial").length} im Test
            · {networks.filter((item) => item.status === "draft").length}{" "}
            Entwürfe
          </span>
        </div>
        <button
          className="portalPrimary"
          type="button"
          onClick={() => open("create")}
        >
          + Netzwerk anlegen
        </button>
      </div>
      <label className="adminNetworkSearch">
        <span>Netzwerk finden</span>
        <input
          type="search"
          placeholder="Name oder Netzwerkkennung suchen …"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="adminNetworkList adminNetworkCompactGrid">
        {networks
          .filter((network) =>
            `${network.name} ${network.slug}`
              .toLocaleLowerCase("de-DE")
              .includes(query.toLocaleLowerCase("de-DE")),
          )
          .map((network) => {
            const tone =
              network.status === "active"
                ? "teal"
                : network.status === "suspended"
                  ? "red"
                  : network.status === "trial"
                    ? "amber"
                    : "gray";
            const trialEnd = network.trialEndsAt
              ? new Date(network.trialEndsAt).toLocaleDateString("de-DE")
              : null;
            return (
              <section
                className="adminNetworkCard adminNetworkCompactCard"
                key={network.id}
                style={
                  {
                    "--card-accent": /^#[0-9a-f]{6}$/i.test(
                      network.primaryColor || "",
                    )
                      ? network.primaryColor
                      : "#5364d9",
                    "--card-dark": /^#[0-9a-f]{6}$/i.test(
                      network.secondaryColor || "",
                    )
                      ? network.secondaryColor
                      : "#173143",
                  } as CSSProperties
                }
              >
                <header>
                  <div className="adminNetworkIdentity">
                    <span className="adminNetworkLogo">
                      {network.logoUrl ? (
                        <img
                          src={network.logoUrl}
                          alt={`${network.name} Logo`}
                        />
                      ) : (
                        network.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()
                      )}
                    </span>
                    <div>
                      <small>{network.slug}</small>
                      <h2>{network.name}</h2>
                      {network.websiteUrl && (
                        <a
                          href={network.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {network.websiteUrl
                            .replace(/^https?:\/\/(www\.)?/, "")
                            .replace(/\/$/, "")}
                        </a>
                      )}
                    </div>
                  </div>
                  <AdminNetworkActivity
                    id={network.id}
                    name={network.name}
                    slug={network.slug}
                    summary={network.activitySummary}
                    onChanged={() => void refreshNetworks()}
                  />
                </header>
                <div className="adminNetworkCompactStatus">
                  <Status tone={tone}>{labels[network.status]}</Status>
                  <span>{network.memberCount || 0} Mitglieder</span>
                  {trialEnd && <span>Test bis {trialEnd}</span>}
                </div>
                <div className="adminNetworkCompactFacts">
                  <div>
                    <span>Administration</span>
                    <strong>{adminName(network)}</strong>
                  </div>
                  <div>
                    <span>Abrechnung</span>
                    <strong>
                      {network.settings.memberPaymentModel === "network"
                        ? "Netzwerk zahlt zentral"
                        : "Mitglieder zahlen selbst"}
                    </strong>
                  </div>
                  {!!network.activitySummary?.pendingCount && (
                    <p className="adminNetworkPending">
                      {network.activitySummary.pendingCount}{" "}
                      {network.activitySummary.pendingCount === 1
                        ? "Aufnahme wartet"
                        : "Aufnahmen warten"}{" "}
                      auf Prüfung
                    </p>
                  )}
                </div>
                {network.latestOrder?.status === "submitted" && (
                  <section className="adminNetworkOrderNotice">
                    <div>
                      <small>VERBINDLICHE MODULBUCHUNG EINGEGANGEN</small>
                      <b>{network.latestOrder.invoiceCompany}</b>
                      <span>
                        {network.latestOrder.participantCount} Nutzer ·{" "}
                        {network.latestOrder.selectedModules.length}{" "}
                        kostenpflichtige Module ·{" "}
                        {(
                          network.latestOrder.monthlyNetCents / 100
                        ).toLocaleString("de-DE", {
                          style: "currency",
                          currency: "EUR",
                        })}{" "}
                        netto / Monat
                      </span>
                      <span>
                        {new Date(
                          network.latestOrder.submittedAt,
                        ).toLocaleString("de-DE")}{" "}
                        · zwölf Monate im Voraus
                      </span>
                    </div>
                    <div>
                      <span>Bestellnummer</span>
                      <code>{network.latestOrder.id}</code>
                      <div className="adminNetworkOrderActions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decideOrder(network, "accepted")}
                        >
                          Annehmen &amp; aktivieren
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decideOrder(network, "rejected")}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  </section>
                )}
                <details
                  className="adminNetworkActionMenu"
                  name="network-actions"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.currentTarget.open = false;
                      event.currentTarget.querySelector("summary")?.focus();
                    }
                  }}
                >
                  <summary>
                    Netzwerk verwalten <span aria-hidden="true">⋯</span>
                  </summary>
                  <div className="adminNetworkActions">
                    <AdminNetworkBilling
                      id={network.id}
                      name={network.name}
                      onSaved={() => {
                        void portalRequest<Network[]>("/networks/admin", {
                          token: getPortalSession() || "",
                        })
                          .then(setNetworks)
                          .catch(showError);
                      }}
                    />
                    <AdminNetworkShare id={network.id} name={network.name} />
                    <AdminNetworkUsers id={network.id} name={network.name} />
                    <a
                      href={`/registrieren?network=${encodeURIComponent(network.slug)}&mode=login`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Netzwerk-Login öffnen ↗
                    </a>
                    {
                      <Link
                        className="adminNetworkTestLogin"
                        href={`/portal/netzwerk/${network.slug}` as never}
                        onClick={async (event) => {
                          event.preventDefault();
                          try {
                            await portalRequest(
                              `/networks/${network.id}/operator-access`,
                              { token: getPortalSession() || "", body: {} },
                            );
                            window.location.href = `/portal/netzwerk/${network.slug}`;
                          } catch (error) {
                            showError(error);
                          }
                        }}
                      >
                        <span aria-hidden="true">→</span>
                        Betreiberzugang öffnen
                      </Link>
                    }
                    <button
                      className="portalSecondary"
                      type="button"
                      onClick={() => open("trial", network.id)}
                    >
                      Testzugang
                    </button>
                    <button
                      className="portalSecondary"
                      type="button"
                      onClick={() => open("admin", network.id)}
                    >
                      Administrator bestimmen
                    </button>
                    {network.status !== "active" ? (
                      <button
                        disabled={busy}
                        className="portalPrimary"
                        type="button"
                        onClick={() =>
                          void updateAccessFor(network.id, "active")
                        }
                      >
                        Partnerportal aktivieren
                      </button>
                    ) : null}
                    {network.status === "active" ? (
                      <button
                        disabled={busy}
                        className="portalReject adminNetworkBlock"
                        type="button"
                        onClick={() => {
                          setSelected(network.id);
                          void updateAccessFor(network.id, "suspended");
                        }}
                      >
                        Sperren
                      </button>
                    ) : null}
                    <button
                      disabled={busy}
                      className="portalReject"
                      type="button"
                      title="Netzwerk vollständig löschen"
                      aria-label={`${network.name} vollständig löschen`}
                      onClick={() => void deleteNetwork(network)}
                    >
                      ⌫
                    </button>
                  </div>
                </details>
              </section>
            );
          })}
      </div>
      {dialog && (
        <div
          className="networkModalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <section
            className="networkModal adminNetworkModal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>PLATTFORMADMINISTRATION</span>
                <h2>
                  {dialog === "create"
                    ? "Neuen Netzwerkpartner anlegen"
                    : dialog === "trial"
                      ? "Testzugang erteilen"
                      : "Netzwerkadministrator einladen"}
                </h2>
              </div>
              <button
                onClick={() => setDialog(null)}
                aria-label="Dialog schließen"
              >
                ×
              </button>
            </header>
            {dialog === "create" ? (
              <form onSubmit={createNetwork}>
                <div>
                  <label>
                    Netzwerkname
                    <input
                      name="name"
                      required
                      minLength={2}
                      placeholder="Beispiel Netzwerk e. V."
                    />
                  </label>
                  <label>
                    Technische Kennung
                    <input
                      name="slug"
                      required
                      pattern="[a-z0-9-]+"
                      placeholder="beispiel-netzwerk"
                    />
                  </label>
                </div>
                <label>
                  Rechtlicher Name
                  <input name="legalName" placeholder="Optional" />
                </label>
                <label>
                  Website
                  <input
                    name="websiteUrl"
                    type="url"
                    placeholder="https://www.beispiel.de"
                  />
                </label>
                <p>
                  Das Netzwerk wird als leere, geschlossene Hülle ohne Zugriff,
                  Initiator angelegt. Alle Funktionen sind enthalten; der
                  Initiator bleibt kostenlos.
                </p>
                <label>
                  Mitgliedspreis netto pro Monat (€)
                  <input
                    name="memberMonthlyPrice"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    defaultValue={69}
                    required
                  />
                  <small>
                    Bei Einzelzahlung: pro Partnermitglied für die eingestellte
                    Laufzeit zzgl. 19 % MwSt. Bei zentraler Zahlung erfolgt die
                    Netzwerkrechnung separat gemäß Vereinbarung; dieser Preis
                    wird den Mitgliedern nicht angezeigt. Initiator kostenlos.
                    Später unter „Anmeldungen & Mitgliedsjahre“ änderbar.
                  </small>
                </label>
                <label>
                  Laufzeit in Monaten
                  <input
                    type="number"
                    name="billingMonths"
                    min="1"
                    max="36"
                    defaultValue={12}
                    required
                  />
                </label>
                <LaunchPromotionSettings/>
                <details>
                  <summary>
                    Abrechnungszeitraum und Rechnungsversand (optional)
                  </summary>
                  <p>
                    Ohne feste Datumsangaben beginnt die Laufzeit bei der
                    Buchung. Ein fester Zeitraum gilt nur, wenn du ihn
                    ausdrücklich festlegst.
                  </p>
                  <label>
                    Kostenlos bis einschließlich
                    <input type="date" name="billingFreeUntil" />
                  </label>
                  <label>
                    Kostenpflichtig ab
                    <input type="date" name="billingPaidFrom" />
                  </label>
                  <label>
                    Kostenpflichtig bis einschließlich
                    <input type="date" name="billingPaidThrough" />
                  </label>
                  <label className="billingInlineChoice">
                    <input type="checkbox" name="billingAutoInvoices" />
                    Validierte E-Rechnungen automatisch versenden
                  </label>
                  <p>
                    Versand 15 Tage vor Ende der kostenlosen Phase, Zahlungsziel
                    14 Tage. Bestehende Buchungen werden nicht rückwirkend
                    geändert.
                  </p>
                </details>
                <label>
                  Wer bezahlt die Netzwerkmitgliedschaften?
                  <select
                    name="memberPaymentModel"
                    required
                    defaultValue="individual"
                  >
                    <option value="individual">
                      Mitglieder zahlen selbst – persönliche Rechnung
                    </option>
                    <option value="network">
                      Netzwerk zahlt zentral – keine Zahlung durch Mitglieder
                    </option>
                  </select>
                  <small>
                    Bei zentraler Zahlung sehen Mitglieder keine Preise oder
                    Rechnungsfelder. Die Abrechnung mit dem Netzwerk erfolgt
                    separat gemäß eurer Vereinbarung; es werden keine
                    persönlichen Mitgliedsrechnungen erstellt.
                  </small>
                </label>
                <div className="adminNetworkDialogActions">
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button disabled={busy} className="portalPrimary">
                    Netzwerk anlegen
                  </button>
                </div>
              </form>
            ) : dialog === "trial" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateAccess("trial", trialDays);
                }}
              >
                <label>
                  Laufzeit
                  <select
                    value={trialDays}
                    onChange={(event) =>
                      setTrialDays(Number(event.target.value))
                    }
                  >
                    <option value={14}>14 Tage</option>
                    <option value={30}>30 Tage</option>
                    <option value={60}>60 Tage</option>
                    <option value={90}>90 Tage</option>
                  </select>
                </label>
                <p>Nach Ablauf endet der Netzwerkzugriff automatisch.</p>
                <div className="adminNetworkDialogActions">
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button disabled={busy} className="portalPrimary">
                    Testzugang freigeben
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={appoint}>
                <label>
                  Geschäftliche E-Mail-Adresse
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@netzwerk.de"
                  />
                </label>
                <label>
                  Rolle
                  <select disabled>
                    <option>Initiator / Netzwerkadministrator</option>
                  </select>
                </label>
                <p>
                  Ist noch kein Konto vorhanden, wird ein persönlicher, 14 Tage
                  gültiger Einladungslink versendet. Die eingeladene Person wird
                  ausschließlich als Initiator dieses Mandanten registriert und
                  nach der Anmeldung direkt in die Netzwerkoberfläche geführt.
                </p>
                <div className="adminNetworkDialogActions">
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button disabled={busy} className="portalPrimary">
                    Initiator einladen oder zuweisen
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      {testAccess && (
        <div
          className="networkModalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTestAccess(null);
          }}
        >
          <section
            className="networkModal adminNetworkModal adminNetworkTestSuccess"
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-access-ready-title"
          >
            <header>
              <div>
                <span>TESTZUGANG AKTIV</span>
                <h2 id="test-access-ready-title">
                  Testbereich ist freigeschaltet
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTestAccess(null)}
                aria-label="Dialog schließen"
              >
                ×
              </button>
            </header>
            <div className="adminNetworkTestSummary">
              <strong aria-hidden="true">✓</strong>
              <div>
                <b>{testAccess.name}</b>
                <p>
                  Sie können jetzt direkt in die geschützte Testansicht
                  wechseln. Ihre bestehende Administrationssitzung bleibt dabei
                  erhalten.
                </p>
                {testAccess.trialEndsAt && (
                  <small>
                    Testzugang gültig bis{" "}
                    {new Date(testAccess.trialEndsAt).toLocaleDateString(
                      "de-DE",
                    )}
                  </small>
                )}
              </div>
            </div>
            {!testAccess.administrator && (
              <p className="adminNetworkTestHint">
                Für einen vollständig rollengetreuen Test bestimmen Sie
                anschließend noch einen Netzwerkadministrator. Die Testansicht
                können Sie bereits jetzt öffnen.
              </p>
            )}
            <div className="adminNetworkDialogActions">
              <button type="button" onClick={() => setTestAccess(null)}>
                Zur Übersicht
              </button>
              <Link
                className="portalPrimary adminNetworkLoginCta"
                href={`/portal/netzwerk/${testAccess.slug}` as never}
                onClick={() => setTestAccess(null)}
              >
                <span aria-hidden="true">→</span>Testansicht jetzt öffnen
              </Link>
            </div>
          </section>
        </div>
      )}
      {notice && (
        <div className="networkNotice" role="status">
          ✓ {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
    </div>
  );

  async function updateAccessFor(id: string, status: NetworkStatus) {
    const token = getPortalSession();
    if (!token)
      return setNotice(
        "Bitte melden Sie sich zuerst als Plattformadministrator an.",
      );
    setBusy(true);
    try {
      const updated = await portalRequest<Network>(`/networks/${id}/access`, {
        token,
        body: { status, selfRegistration: false },
      });
      setNetworks((items) =>
        items.map((item) => (item.id === id ? { ...item, ...updated } : item)),
      );
      setNotice(
        status === "active"
          ? "Das Netzwerk wurde dauerhaft aktiviert."
          : "Das Netzwerk wurde gesperrt.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
}
