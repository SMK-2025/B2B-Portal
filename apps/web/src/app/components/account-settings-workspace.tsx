"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MemberBillingAccount } from "./member-billing-account";
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
      emailMfa: boolean;
      welcomeMail: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [done, setDone] = useState(false);
  const [credits,setCredits]=useState<{network:string;available:number;redeemed:number}[]|null>(null);
  const [challenge, setChallenge] = useState("");
  async function load() {
    const token = getPortalSession();
    if (!token) {
      setNotice("Bitte melden Sie sich erneut an.");
      return;
    }
    try {
      setAccount(await portalRequest("/auth/account", { token, body: {} }));
      setCredits(await portalRequest("/networks/account/referral-balance",{token}));
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
      <MemberBillingAccount />
      <section className="networkCard accountSecurityCard"><header><h2>Meine Empfehlungen</h2></header>
        {credits===null ? <p>Guthaben nicht geladen.</p> : credits.length ? credits.map((c,i)=><p key={i}>{c.network}: {c.available} Freimonat(e) verfügbar · {c.redeemed} verrechnet</p>) : <p>Aktuell kein Freimonat vorgemerkt.</p>}
        {account && <label><input type="checkbox" checked={account.welcomeMail} disabled={busy} onChange={async e=>{
          const enabled=e.target.checked;setBusy(true);try{setAccount(await portalRequest("/auth/account/welcome-mail",{token:getPortalSession()||"",body:{enabled}}));}catch{setNotice("Einstellung konnte nicht gespeichert werden.");}finally{setBusy(false);}
        }}/> Per E-Mail über neue Unternehmensseiten in meinen Netzwerken informieren</label>}
      </section>
      {account && (
        <section className="networkCard accountSecurityCard">
          <header>
            <h2>Anmeldung in zwei Schritten</h2>
          </header>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setBusy(true);
              setNotice("");
              try {
                const result = await portalRequest<{
                  challengeId?: string;
                  changed?: boolean;
                }>("/auth/account/mfa", {
                  token: getPortalSession() || "",
                  body: {
                    enabled: !account.emailMfa,
                    currentPassword: form.get("password"),
                    challengeId: challenge || undefined,
                    code: form.get("code"),
                  },
                });
                if (result.challengeId) setChallenge(result.challengeId);
                if (result.changed) {
                  clearPortalSession();
                  window.location.assign(login);
                }
              } catch (error) {
                setNotice(
                  error instanceof Error
                    ? error.message
                    : "Änderung fehlgeschlagen.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              {account.emailMfa ? "Aktiv" : "Nicht aktiv"} · Bei aktivierter
              Prüfung erhältst du bei jeder Anmeldung einen sechsstelligen Code
              per E-Mail.
            </p>
            {challenge ? (
              <label>
                Code aus der E-Mail
                <input
                  name="code"
                  key="code"
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                />
              </label>
            ) : (
              <label>
                Aktuelles Passwort
                <input
                  key="pwd"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
            )}
            <button disabled={busy}>
              {challenge
                ? "Änderung bestätigen und neu anmelden"
                : account.emailMfa
                  ? "Deaktivierung bestätigen lassen"
                  : "Aktivierung bestätigen lassen"}
            </button>
            {challenge && (
              <button type="button" onClick={() => setChallenge("")}>
                Abbrechen
              </button>
            )}
          </form>
        </section>
      )}
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
