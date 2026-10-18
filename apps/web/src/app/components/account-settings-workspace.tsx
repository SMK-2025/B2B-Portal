"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  clearPortalSession,
  getPortalSession,
  portalRequest,
} from "../lib/portal-api";
export function AccountSettingsWorkspace({
  networkSlug,
}: {
  networkSlug?: string;
}) {
  const [account, setAccount] = useState<{
      email: string;
      pendingEmail: string | null;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [done, setDone] = useState(false);
  async function load() {
    const token = getPortalSession();
    if (!token) {
      setNotice("Bitte melden Sie sich erneut an.");
      return;
    }
    try {
      setAccount(await portalRequest("/auth/account", { token, body: {} }));
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Kontodaten konnten nicht geladen werden.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(
    event: FormEvent<HTMLFormElement>,
    kind: "password" | "email" | "cancel",
  ) {
    event.preventDefault();
    const formElement = event.currentTarget,
      form = new FormData(formElement),
      token = getPortalSession();
    if (!token) return;
    setBusy(true);
    setNotice("");
    try {
      await portalRequest(
        kind === "password"
          ? "/auth/password/change"
          : kind === "email"
            ? "/auth/email-change/request"
            : "/auth/email-change/cancel",
        { token, body: Object.fromEntries(form) },
      );
      formElement.reset();
      if (kind === "password") {
        clearPortalSession();
        setDone(true);
      } else {
        await load();
        setNotice(
          kind === "email"
            ? "Bestätigungslink an die neue Adresse versendet. Ihre bisherige Login-Adresse bleibt bis zur Bestätigung gültig."
            : "Die E-Mail-Änderung wurde abgebrochen.",
        );
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Änderung nicht möglich.");
    } finally {
      setBusy(false);
    }
  }
  const login = networkSlug
    ? "/anmelden?network=" + encodeURIComponent(networkSlug)
    : "/anmelden";
  if (done)
    return (
      <section className="networkCard accountSecurityCard">
        <header>
          <h2>Passwort geändert</h2>
        </header>
        <div>
          <p>
            Alle Sitzungen wurden aus Sicherheitsgründen beendet. Melden Sie
            sich bitte mit Ihrem neuen Passwort an.
          </p>
          <Link className="networkPrimary" href={login as never}>
            Erneut anmelden
          </Link>
        </div>
      </section>
    );
  return (
    <div className="networkFunctionalWorkspace accountSecuritySettings">
      {notice && (
        <p role="status" className="networkModulePurpose">
          {notice}
        </p>
      )}
      <section className="networkModulePurpose">
        <strong>Ihre persönlichen Zugangsdaten</strong>
        <p>
          Änderungen gelten nur für Ihr eigenes Konto, nicht für andere
          Mitglieder. Ihre Login-E-Mail ist unabhängig von der Kontaktadresse
          auf Ihrer Unternehmensseite.
        </p>
      </section>
      <section className="networkCard accountSecurityCard">
        <header>
          <h2>Passwort ändern</h2>
        </header>
        <form onSubmit={(e) => void submit(e, "password")}>
          <label>
            Aktuelles Passwort
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <label>
            Neues Passwort
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={200}
            />
            <small>
              Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben, Zahl und
              Sonderzeichen.
            </small>
          </label>
          <label>
            Neues Passwort wiederholen
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={200}
            />
          </label>
          <p>Nach dem Speichern werden Sie auf allen Geräten abgemeldet.</p>
          <button className="networkPrimary" disabled={busy || !account}>
            Passwort sicher ändern
          </button>
        </form>
      </section>
      <section className="networkCard accountSecurityCard">
        <header>
          <h2>Login-E-Mail-Adresse ändern</h2>
        </header>
        <form onSubmit={(e) => void submit(e, "email")}>
          <p>
            Aktuell: <strong>{account?.email || "Wird geladen …"}</strong>
          </p>
          <label>
            Neue E-Mail-Adresse
            <input
              name="newEmail"
              type="email"
              autoComplete="email"
              required
              maxLength={250}
            />
          </label>
          <label>
            Aktuelles Passwort zur Sicherheitsbestätigung
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <p>
            Sie erhalten einen 30 Minuten gültigen Link an die neue Adresse.
            Erst nach Bestätigung mit Ihrem aktuellen Passwort wird sie zur
            Login-Adresse. Ihre bisherige Adresse erhält einen
            Sicherheitshinweis.
          </p>
          <button className="networkPrimary" disabled={busy || !account}>
            Bestätigungslink senden
          </button>
        </form>
        {account?.pendingEmail && (
          <form onSubmit={(e) => void submit(e, "cancel")}>
            <strong>Bestätigung ausstehend: {account.pendingEmail}</strong>
            <label>
              Aktuelles Passwort
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
              />
            </label>
            <button disabled={busy}>E-Mail-Änderung abbrechen</button>
          </form>
        )}
      </section>
    </div>
  );
}
