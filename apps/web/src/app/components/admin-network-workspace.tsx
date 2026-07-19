"use client";

import { FormEvent, useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { Status } from "./portal-shell";

type NetworkStatus = "draft" | "trial" | "active" | "suspended";
type Network = {
  id: string;
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
const NETWORK_ID = "10000000-0000-4000-8000-000000000001";
const labels: Record<NetworkStatus, string> = {
  draft: "Entwurf",
  trial: "Testzugang",
  active: "Aktiv",
  suspended: "Gesperrt",
};

export function AdminNetworkWorkspace() {
  const [network, setNetwork] = useState<Network>({
    id: NETWORK_ID,
    name: "Unternehmerfreunde NRW",
    websiteUrl: "https://www.unternehmerfreunde-nrw.de/",
    status: "draft",
    trialEndsAt: null,
    settings: { selfRegistration: false },
    administrator: null,
  });
  const [trialDays, setTrialDays] = useState(30);
  const [admin, setAdmin] = useState("Noch nicht vergeben");
  const [dialog, setDialog] = useState<"trial" | "admin" | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getPortalSession();
    if (!token) return;
    portalRequest<Network[]>("/networks/admin", { token })
      .then((items) => {
        if (items[0]) {
          setNetwork(items[0]);
          const person = items[0].administrator?.user;
          if (person)
            setAdmin(
              `${person.firstName} ${person.lastName} · ${person.email}`,
            );
        }
      })
      .catch((error) =>
        setNotice(
          error instanceof Error
            ? error.message
            : "Netzwerke konnten nicht geladen werden.",
        ),
      );
  }, []);

  async function updateAccess(status: NetworkStatus, days?: number) {
    const token = getPortalSession();
    if (!token) {
      setNotice("Bitte melden Sie sich zuerst als Plattformadministrator an.");
      return;
    }
    setBusy(true);
    try {
      const updated = await portalRequest<Network>(
        `/networks/${network.id}/access`,
        {
          token,
          body: {
            status,
            ...(days ? { trialDays: days } : {}),
            selfRegistration: status === "active" || status === "trial",
          },
        },
      );
      setNetwork((current) => ({ ...current, ...updated }));
      setDialog(null);
      setNotice(
        status === "trial"
          ? `Testzugang für ${days} Tage wurde erteilt.`
          : status === "active"
            ? "Das Netzwerk wurde dauerhaft aktiviert."
            : "Das Netzwerk wurde gesperrt.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Die Änderung konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function grantTrial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateAccess("trial", trialDays);
  }

  async function appointAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token) {
      setNotice("Bitte melden Sie sich zuerst als Plattformadministrator an.");
      return;
    }
    const email = String(new FormData(event.currentTarget).get("email"));
    setBusy(true);
    try {
      await portalRequest(`/networks/${network.id}/administrator`, {
        token,
        body: { email },
      });
      setAdmin(email);
      setDialog(null);
      setNotice(
        "Die Netzwerkadministrator-Rolle wurde verbindlich zugewiesen.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Die Rolle konnte nicht zugewiesen werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  const label = labels[network.status];
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
    <>
      <section className="adminNetworkNotice">
        <b>Rollenhoheit beim Plattforminhaber</b>
        <p>
          Netzwerkpartner können weder ihren Mandanten selbst aktivieren noch
          die Rolle Netzwerkadministrator eigenständig vergeben.
        </p>
      </section>
      <div className="adminNetworkToolbar">
        <div>
          <strong>1 Netzwerkpartner</strong>
          <span>Zentrale Freigabe und Rollensteuerung</span>
        </div>
        <button
          className="portalPrimary"
          type="button"
          onClick={() =>
            setNotice(
              "Die Anlage weiterer Netzwerkpartner folgt als nächster modularer Schritt.",
            )
          }
        >
          + Netzwerk anlegen
        </button>
      </div>
      <section className="adminNetworkCard">
        <header>
          <div className="adminNetworkIdentity">
            <span>UF</span>
            <div>
              <small>NETZWERKPARTNER</small>
              <h2>{network.name}</h2>
              <a
                href={network.websiteUrl || "#"}
                target="_blank"
                rel="noreferrer"
              >
                unternehmerfreunde-nrw.de
              </a>
            </div>
          </div>
          <Status tone={tone}>{label}</Status>
        </header>
        <div className="adminNetworkFacts">
          <article>
            <small>Zugangsstatus</small>
            <b>{label}</b>
            <span>
              {trialEnd
                ? `Testzugang bis ${trialEnd}`
                : network.status === "active"
                  ? "Dauerhaft freigeschaltet"
                  : "Noch nicht freigeschaltet"}
            </span>
          </article>
          <article>
            <small>Netzwerkadministrator</small>
            <b>{admin}</b>
            <span>Vergabe ausschließlich durch Sie</span>
          </article>
          <article>
            <small>Mitgliederregistrierung</small>
            <b>
              {network.settings.selfRegistration ? "Aktiviert" : "Deaktiviert"}
            </b>
            <span>Nur innerhalb freigegebener Netzwerke</span>
          </article>
          <article>
            <small>Mandant</small>
            <b>Vorbereitet</b>
            <span>Geschlossener Netzwerkbereich</span>
          </article>
        </div>
        <footer className="adminNetworkActions">
          <button
            className="portalSecondary"
            type="button"
            onClick={() => setDialog("trial")}
          >
            Testzugang erteilen
          </button>
          <button
            className="portalSecondary"
            type="button"
            onClick={() => setDialog("admin")}
          >
            Administrator bestimmen
          </button>
          {network.status !== "active" ? (
            <button
              disabled={busy}
              className="portalPrimary"
              type="button"
              onClick={() => updateAccess("active")}
            >
              Netzwerk aktivieren
            </button>
          ) : (
            <button
              disabled={busy}
              className="portalReject adminNetworkBlock"
              type="button"
              onClick={() => updateAccess("suspended")}
            >
              Netzwerk sperren
            </button>
          )}
        </footer>
      </section>
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
                  {dialog === "trial"
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
            {dialog === "trial" ? (
              <form onSubmit={grantTrial}>
                <label>
                  Laufzeit des Testzugangs
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
                <p>
                  Nach Ablauf endet der Zugriff automatisch. Eine dauerhafte
                  Aktivierung bleibt Ihnen vorbehalten.
                </p>
                <footer>
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button disabled={busy} className="portalPrimary">
                    Testzugang freigeben
                  </button>
                </footer>
              </form>
            ) : (
              <form onSubmit={appointAdmin}>
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
                  Das Benutzerkonto muss bereits registriert und einem
                  Unternehmen zugeordnet sein. Die Rechte gelten ausschließlich
                  für diesen Netzwerkmandanten.
                </p>
                <footer>
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button disabled={busy} className="portalPrimary">
                    Rolle verbindlich zuweisen
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
      {notice && (
        <div className="networkNotice" role="status">
          ✓ {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
    </>
  );
}
