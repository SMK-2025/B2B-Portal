"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import {
  portalRequest,
  routeForRole,
  savePortalSession,
} from "../lib/portal-api";

type LoginResult = { token: string; user: { accountRole: string } };
type Organization = { role: "buyer" | "provider" | "both" };

export default function Anmelden() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await portalRequest<LoginResult>("/auth/login", {
        body: { email: form.get("email"), password: form.get("password") },
      });
      const remember = form.get("remember") === "on";
      savePortalSession(result.token, remember);
      if (
        result.user.accountRole === "platform_admin" ||
        result.user.accountRole === "reviewer"
      ) {
        router.push("/portal/admin");
        return;
      }
      const organizations = await portalRequest<Organization[]>(
        "/organizations/mine",
        { token: result.token },
      );
      if (!organizations.length) {
        router.push("/registrieren?onboarding=1");
        return;
      }
      router.push(routeForRole(organizations[0]?.role));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Die Anmeldung ist fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="v2">
      <SiteHeader />
      <section className="authPage loginPage">
        <aside className="authStory">
          <span>WILLKOMMEN ZURÜCK</span>
          <h1>Ihre nächsten Geschäftschancen warten.</h1>
          <p>
            Öffnen Sie Ihren persönlichen Arbeitsbereich und setzen Sie dort
            fort, wo Sie aufgehört haben.
          </p>
          <div className="loginPreview">
            <div>
              <b>Matches prüfen</b>
              <span>Passung verstehen und gezielt entscheiden</span>
            </div>
            <div>
              <b>Gespräche fortsetzen</b>
              <span>Nachrichten, Termine und nächste Schritte</span>
            </div>
            <div>
              <b>Status im Blick behalten</b>
              <span>Alle Aktivitäten zentral dokumentiert</span>
            </div>
          </div>
        </aside>
        <section className="authCard authCardV2">
          <p className="sectionKicker">SICHERER ZUGANG</p>
          <h2>Bei B2B Matching anmelden</h2>
          <p className="lead">
            Geben Sie Ihre geschäftlichen Zugangsdaten ein.
          </p>
          <form className="formGrid" onSubmit={login}>
            <label className="full">
              Geschäftliche E-Mail-Adresse
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="name@unternehmen.de"
              />
            </label>
            <label className="full">
              Passwort
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
              />
            </label>
            <div className="loginOptions">
              <label>
                <input type="checkbox" name="remember" /> Angemeldet bleiben
              </label>
              <Link href="/passwort-vergessen">Passwort vergessen?</Link>
            </div>
            <button className="primary full" disabled={loading}>
              {loading ? "Anmeldung wird geprüft …" : "Sicher anmelden"}
            </button>
          </form>
          {message && (
            <p className="error" role="alert">
              {message}
            </p>
          )}
          <p className="authHint">
            Noch nicht dabei?{" "}
            <Link href="/registrieren">Geschäftlich registrieren</Link>
          </p>
          <p className="authSecurity">
            Geschützter Zugang · Verschlüsselte Übertragung
          </p>
        </section>
      </section>
      <section className="authAfter">
        <span>NOCH KEIN PROFIL?</span>
        <h2>Warum sich die Registrierung lohnt.</h2>
        <div>
          <article>
            <b>Für Unternehmen</b>
            <p>
              Kostenlos passende Dienstleister finden, ohne den Bedarf
              öffentlich auszuschreiben.
            </p>
            <Link href="/unternehmen">Mehr erfahren →</Link>
          </article>
          <article>
            <b>Für Dienstleister</b>
            <p>
              Kostenlos registrieren und Profil anlegen. Die aktive Nutzung wird
              nach Tarifwahl kostenpflichtig.
            </p>
            <Link href="/dienstleister">Mehr erfahren →</Link>
          </article>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
