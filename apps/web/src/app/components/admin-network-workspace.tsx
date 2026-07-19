"use client";

import { FormEvent, useState } from "react";
import { Status } from "./portal-shell";

type Access = "Entwurf" | "Testzugang" | "Aktiv" | "Gesperrt";

export function AdminNetworkWorkspace() {
  const [access, setAccess] = useState<Access>("Entwurf");
  const [trialDays, setTrialDays] = useState(30);
  const [trialEnd, setTrialEnd] = useState("");
  const [admin, setAdmin] = useState("Noch nicht vergeben");
  const [dialog, setDialog] = useState<"trial" | "admin" | null>(null);
  const [notice, setNotice] = useState("");

  function grantTrial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const end = new Date();
    end.setDate(end.getDate() + trialDays);
    setTrialEnd(end.toLocaleDateString("de-DE"));
    setAccess("Testzugang");
    setDialog(null);
    setNotice(`Testzugang für ${trialDays} Tage wurde vorbereitet.`);
  }

  function appointAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdmin(String(new FormData(event.currentTarget).get("name")));
    setDialog(null);
    setNotice(
      "Die Netzwerkadministrator-Rolle wurde durch den Plattforminhaber zugewiesen.",
    );
  }

  const tone =
    access === "Aktiv"
      ? "teal"
      : access === "Gesperrt"
        ? "red"
        : access === "Testzugang"
          ? "amber"
          : "gray";

  return (
    <>
      <section className="adminNetworkNotice">
        <b>Rollenhoheit beim Plattforminhaber</b>
        <p>
          Netzwerkpartner können weder einen Netzwerkmandanten selbst aktivieren
          noch die Rolle Netzwerkadministrator eigenständig vergeben.
        </p>
      </section>
      <div className="adminNetworkToolbar">
        <div>
          <strong>1 Netzwerkpartner</strong>
          <span>Davon 1 als Entwurf vorbereitet</span>
        </div>
        <button
          className="portalPrimary"
          type="button"
          onClick={() =>
            setNotice(
              "Das Formular für einen neuen Netzwerkpartner ist vorbereitet.",
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
              <h2>Unternehmerfreunde NRW</h2>
              <a
                href="https://www.unternehmerfreunde-nrw.de/"
                target="_blank"
                rel="noreferrer"
              >
                unternehmerfreunde-nrw.de
              </a>
            </div>
          </div>
          <Status tone={tone}>{access}</Status>
        </header>
        <div className="adminNetworkFacts">
          <article>
            <small>Zugangsstatus</small>
            <b>{access}</b>
            <span>
              {trialEnd
                ? `Testzugang bis ${trialEnd}`
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
            <b>Deaktiviert</b>
            <span>Erst nach Ihrer Netzwerkfreigabe möglich</span>
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
          {access !== "Aktiv" ? (
            <button
              className="portalPrimary"
              type="button"
              onClick={() => {
                setAccess("Aktiv");
                setTrialEnd("");
                setNotice("Das Netzwerk wurde dauerhaft aktiviert.");
              }}
            >
              Netzwerk aktivieren
            </button>
          ) : (
            <button
              className="portalReject adminNetworkBlock"
              type="button"
              onClick={() => {
                setAccess("Gesperrt");
                setNotice("Das Netzwerk wurde gesperrt.");
              }}
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
                  Nach Ablauf wird der Netzwerkzugang automatisch gesperrt. Eine
                  dauerhafte Aktivierung ist weiterhin nur durch Sie möglich.
                </p>
                <footer>
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button className="portalPrimary">
                    Testzugang freigeben
                  </button>
                </footer>
              </form>
            ) : (
              <form onSubmit={appointAdmin}>
                <label>
                  Benutzer oder Ansprechpartner
                  <input
                    name="name"
                    required
                    minLength={2}
                    placeholder="Name oder geschäftliche E-Mail-Adresse"
                  />
                </label>
                <label>
                  Rolle
                  <select disabled>
                    <option>Netzwerkadministrator</option>
                  </select>
                </label>
                <p>
                  Diese Rolle erhält Verwaltungsrechte ausschließlich für diesen
                  Netzwerkmandanten, niemals für die gesamte Plattform.
                </p>
                <footer>
                  <button type="button" onClick={() => setDialog(null)}>
                    Abbrechen
                  </button>
                  <button className="portalPrimary">
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
