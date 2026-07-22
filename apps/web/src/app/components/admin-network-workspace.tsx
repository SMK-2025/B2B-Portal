"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { Status } from "./portal-shell";

type NetworkStatus = "draft" | "trial" | "active" | "suspended";
type Network = {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string | null;
  status: NetworkStatus;
  trialEndsAt: string | null;
  settings: { selfRegistration: boolean };
  administrator: {
    userId: string;
    user?: { firstName: string; lastName: string; email: string };
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

  useEffect(() => {
    const token = getPortalSession();
    if (!token) return;
    portalRequest<Network[]>("/networks/admin", { token })
      .then((items) => {
        setNetworks(items);
      })
      .catch(showError);
  }, []);
  function showError(error: unknown) {
    setNotice(
      error instanceof Error
        ? error.message
        : "Die Anfrage konnte nicht verarbeitet werden.",
    );
  }
  function adminName(network: Network) {
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
          enabledModules: form.getAll("modules"),
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
            selfRegistration: status === "active" || status === "trial",
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
      await portalRequest(`/networks/${selected}/administrator`, {
        token,
        body: { email },
      });
      const refreshed = await portalRequest<Network[]>("/networks/admin", {
        token,
      });
      setNetworks(refreshed);
      setDialog(null);
      setNotice(
        "Die Netzwerkadministrator-Rolle wurde verbindlich zugewiesen.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function deleteNetwork(network:Network){
    const confirmation=window.prompt(`„${network.name}“ einschließlich Mitgliedschaften und Inhalten dauerhaft löschen? Geben Sie zur Bestätigung ${network.slug} ein:`);
    if(confirmation!==network.slug)return;
    const token=getPortalSession();if(!token)return setNotice("Bitte melden Sie sich erneut als Plattformadministrator an.");
    setBusy(true);try{await portalRequest(`/networks/${network.id}/delete`,{token,body:{confirmSlug:confirmation}});setNetworks(items=>items.filter(item=>item.id!==network.id));setNotice(`${network.name} wurde vollständig gelöscht.`)}catch(error){showError(error)}finally{setBusy(false)}
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
      <div className="adminNetworkList">
        {networks.map((network) => {
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
            <section className="adminNetworkCard" key={network.id}>
              <header>
                <div className="adminNetworkIdentity">
                  <span>
                    {network.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div>
                    <small>NETZWERKPARTNER · {network.slug}</small>
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
                <Status tone={tone}>{labels[network.status]}</Status>
              </header>
              <div className="adminNetworkFacts">
                <article>
                  <small>Zugangsstatus</small>
                  <b>{labels[network.status]}</b>
                  <span>
                    {trialEnd
                      ? `Testzugang bis ${trialEnd}`
                      : network.status === "active"
                        ? "Dauerhaft freigeschaltet"
                        : "Nicht öffentlich nutzbar"}
                  </span>
                </article>
                <article>
                  <small>Netzwerkadministrator</small>
                  <b>{adminName(network)}</b>
                  <span>Vergabe ausschließlich durch Sie</span>
                </article>
                <article>
                  <small>Mitgliederregistrierung</small>
                  <b>
                    {network.settings.selfRegistration
                      ? "Aktiviert"
                      : "Deaktiviert"}
                  </b>
                  <span>Nur im freigegebenen Mandanten</span>
                </article>
                <article>
                  <small>Mandant</small>
                  <b>Getrennt geführt</b>
                  <span>Eigene Mitglieder, Inhalte und Rollen</span>
                </article>
              </div>
              <footer className="adminNetworkActions">
                {network.status === "trial" && (
                  <Link
                    className="adminNetworkTestLogin"
                    href={`/portal/netzwerk/${network.slug}` as never}
                    target="_blank"
                  >
                    <span aria-hidden="true">↗</span>
                    Als Testnutzer öffnen
                  </Link>
                )}
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
                    onClick={() => {
                      setSelected(network.id);
                      void updateAccessFor(network.id, "active");
                    }}
                  >
                    Aktivieren
                  </button>
                ) : (
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
                )}
                <button disabled={busy} className="portalReject" type="button" title="Netzwerk vollständig löschen" aria-label={`${network.name} vollständig löschen`} onClick={()=>void deleteNetwork(network)}>⌫</button>
              </footer>
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
                      : "Netzwerkadministrator bestimmen"}
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
                <fieldset className="adminModuleSelection">
                  <legend>Startmodule</legend>
                  {[
                    ["members", "Mitglieder"],
                    ["profiles", "Profile"],
                    ["matching", "Matching"],
                    ["communication", "Kommunikation"],
                    ["events", "Veranstaltungen"],
                    ["documents", "Dokumente"],
                  ].map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="checkbox"
                        name="modules"
                        value={value}
                        defaultChecked={["members", "profiles"].includes(value)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <p>
                  Das Netzwerk wird ohne Zugriff und ohne Administratorrolle als
                  Entwurf angelegt.
                </p>
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
                    <option>Netzwerkadministrator</option>
                  </select>
                </label>
                <p>
                  Das Konto muss registriert und einem Unternehmen zugeordnet
                  sein. Die Rechte gelten nur für den ausgewählten Mandanten.
                </p>
                <div className="adminNetworkDialogActions">
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button disabled={busy} className="portalPrimary">
                    Rolle zuweisen
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
                <h2 id="test-access-ready-title">Testbereich ist freigeschaltet</h2>
              </div>
              <button type="button" onClick={() => setTestAccess(null)} aria-label="Dialog schließen">×</button>
            </header>
            <div className="adminNetworkTestSummary">
              <strong aria-hidden="true">✓</strong>
              <div>
                <b>{testAccess.name}</b>
                <p>Sie können den Netzwerkbereich jetzt unmittelbar in einem neuen Browser-Tab aus Sicht der Netzwerkverwaltung prüfen.</p>
                {testAccess.trialEndsAt && <small>Testzugang gültig bis {new Date(testAccess.trialEndsAt).toLocaleDateString("de-DE")}</small>}
              </div>
            </div>
            {!testAccess.administrator && <p className="adminNetworkTestHint">Für einen vollständig rollengetreuen Test bestimmen Sie anschließend noch einen Netzwerkadministrator. Die Testansicht können Sie bereits jetzt öffnen.</p>}
            <div className="adminNetworkDialogActions">
              <button type="button" onClick={() => setTestAccess(null)}>Zur Übersicht</button>
              <Link className="portalPrimary adminNetworkLoginCta" href={`/portal/netzwerk/${testAccess.slug}` as never} target="_blank" onClick={() => setTestAccess(null)}><span aria-hidden="true">↗</span>Jetzt als Testnutzer öffnen</Link>
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
        body: { status, selfRegistration: status === "active" },
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
