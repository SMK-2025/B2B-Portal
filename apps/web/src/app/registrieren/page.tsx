"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import {
  getPortalSession,
  portalRequest,
  routeForRole,
  savePortalSession,
} from "../lib/portal-api";

type Step = "account" | "verify" | "organization" | "submitted";
type OrganizationRole = "buyer" | "provider" | "both";
type RegistrationRole = OrganizationRole | "network";
type RegisterResult = {
  verificationToken?: string;
  verificationRequired: boolean;
};
type LoginResult = { token: string };
type OrganizationResult = { id: string };
type NetworkApplicationResult = { network: { slug: string } };

export default function RegistrationPage() {
  const [step, setStep] = useState<Step>("account");
  const [message, setMessage] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [role, setRole] = useState<RegistrationRole>("buyer");
  const [loading, setLoading] = useState(false);
  const [networkSlug, setNetworkSlug] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [createdNetworkSlug, setCreatedNetworkSlug] = useState("");
  const [networkInviteToken, setNetworkInviteToken] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNetworkSlug(params.get("network") || "");
    setInvitedEmail(params.get("email") || "");
    setNetworkInviteToken(params.get("invite") || "");
    if (params.get("rolle") === "netzwerk") setRole("network");
    if (params.get("onboarding") === "1") {
      const token = getPortalSession();
      if (token) {
        setSessionToken(token);
        setStep("organization");
      }
    }
  }, []);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const password = String(form.get("password"));
      const email = String(form.get("email"));
      const result = await portalRequest<RegisterResult>("/auth/register", {
        body: {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email,
          password,
        },
      });
      setCredentials({ email, password });
      setVerificationToken(result.verificationToken ?? "");
      setStep("verify");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Die Registrierung ist fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setMessage("");
    setLoading(true);
    try {
      await portalRequest("/auth/verify-email", {
        body: { token: verificationToken },
      });
      const login = await portalRequest<LoginResult>("/auth/login", {
        body: credentials,
      });
      setSessionToken(login.token);
      savePortalSession(login.token, true);
      setStep("organization");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Die E-Mail konnte nicht bestätigt werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const legalName = String(form.get("legalName"));
      const organization = await portalRequest<OrganizationResult>(
        "/organizations",
        {
          body: {
            legalName,
            displayName: legalName,
            role: role === "network" ? "both" : role,
            websiteUrl: form.get("websiteUrl"),
            ...(networkSlug ? { networkSlug } : {}),
            ...(networkInviteToken ? { networkInviteToken } : {}),
          },
          token: sessionToken,
        },
      );
      await portalRequest(`/organizations/${organization.id}/submit`, {
        body: {},
        token: sessionToken,
      });
      if (role === "network") {
        const application = await portalRequest<NetworkApplicationResult>("/networks/applications", {
          body: { organizationId: organization.id, name: form.get("networkName"), legalName, websiteUrl: form.get("websiteUrl"), authorized: form.get("networkAuthorized") === "on", responsibilityAccepted: form.get("networkResponsibility") === "on", pricingAccepted: form.get("networkPricing") === "on" },
          token: sessionToken,
        });
        setCreatedNetworkSlug(application.network.slug);
      }
      setStep("submitted");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Das Unternehmen konnte nicht angelegt werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  const stepNumber =
    step === "account"
      ? 1
      : step === "verify"
        ? 2
        : step === "organization"
          ? 3
          : 4;
  return (
    <main className="v2">
      <SiteHeader />
      <section className="authPage">
        <aside className="authStory">
          <span>IHR START BEI B2B MATCHING</span>
          <h1>
            Ein Profil.
            <br />
            Neue Möglichkeiten.
          </h1>
          <p>
            Erstellen Sie zunächst nur Ihren Zugang und wählen Sie anschließend,
            wie Sie B2B Matching nutzen möchten. Alle ausführlichen Profildaten
            ergänzen Sie später geführt im Portal.
          </p>
          <div className="authBenefits">
            <article>
              <b>01</b>
              <div>
                <strong>Geschäftlich registrieren</strong>
                <p>Name, geschäftliche E-Mail-Adresse und sicheres Passwort.</p>
              </div>
            </article>
            <article>
              <b>02</b>
              <div>
                <strong>Unternehmen und Rolle wählen</strong>
                <p>
                  Dienstleistungen suchen, anbieten oder beide Möglichkeiten
                  verbinden.
                </p>
              </div>
            </article>
            <article>
              <b>03</b>
              <div>
                <strong>Profil geführt vervollständigen</strong>
                <p>
                  Nach der Anmeldung zeigt Ihnen das Portal die nächsten
                  Schritte.
                </p>
              </div>
            </article>
          </div>
          <small>
            ✓ Unternehmen dauerhaft kostenlos &nbsp; ✓ Dienstleisterprofil
            kostenlos anlegen &nbsp; ✓ Keine Kreditkarte bei Registrierung
          </small>
        </aside>
        <section className="authCard authCardV2">
          <div
            className="registrationProgress"
            aria-label={`Schritt ${stepNumber} von 4`}
          >
            <span style={{ width: `${stepNumber * 25}%` }} />
            <small>SCHRITT {stepNumber} VON 4</small>
          </div>
          {networkSlug === "unternehmerfreunde-nrw" && (
            <div className="networkRegistrationNotice">
              <b>Registrierung für Unternehmerfreunde NRW</b>
              <span>
                Ihr Unternehmen beantragt nach der Registrierung die Aufnahme in
                den geschlossenen Netzwerkbereich.
              </span>
            </div>
          )}
          {step === "account" && (
            <>
              <h1>Konto erstellen</h1>
              <p className="lead">
                Starten Sie mit Ihrer geschäftlichen Identität.
              </p>
              <form onSubmit={register} className="formGrid">
                <label>
                  Vorname
                  <input
                    name="firstName"
                    required
                    minLength={2}
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Nachname
                  <input
                    name="lastName"
                    required
                    minLength={2}
                    autoComplete="family-name"
                  />
                </label>
                <label className="full">
                  Geschäftliche E-Mail
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={invitedEmail}
                    autoComplete="email"
                  />
                </label>
                <label className="full">
                  Passwort
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                  <small>Mindestens 12 Zeichen</small>
                </label>
                <label className="full legalConsent">
                  <input type="checkbox" required />{" "}
                  <span>
                    Ich akzeptiere die{" "}
                    <Link href="/agb" target="_blank">
                      AGB und Nutzungsregeln
                    </Link>{" "}
                    sowie die für meine Rolle geltende{" "}
                    <Link href="/datenschutz/unternehmen" target="_blank">
                      Datenschutzerklärung
                    </Link>
                    .
                  </span>
                </label>
                <button className="primary full" disabled={loading}>
                  {loading ? "Konto wird erstellt …" : "Konto erstellen"}
                </button>
              </form>
              <p className="authHint">
                Bereits registriert?{" "}
                <Link href="/anmelden">Jetzt anmelden</Link>
              </p>
            </>
          )}
          {step === "verify" && (
            <>
              <h1>E-Mail bestätigen</h1>
              <p className="lead">
                Wir haben einen Bestätigungslink an Ihre geschäftliche
                E-Mail-Adresse gesendet.
              </p>
              <div className="verificationNotice">
                <b>Bitte prüfen Sie Ihr Postfach</b>
                <p>
                  Der Link ist 24 Stunden gültig. Schauen Sie bei Bedarf auch in
                  Ihren Spam-Ordner.
                </p>
              </div>
              {verificationToken ? (
                <button
                  className="primary wide"
                  onClick={verify}
                  disabled={loading}
                >
                  {loading
                    ? "E-Mail wird bestätigt …"
                    : "Testbestätigung ausführen"}
                </button>
              ) : (
                <Link className="primary linkButton wide" href="/anmelden">
                  Zur Anmeldung
                </Link>
              )}
            </>
          )}
          {step === "organization" && (
            <>
              <h1>Unternehmen und Nutzung</h1>
              <p className="lead">
                Diese drei Angaben reichen für den Start. Das vollständige
                Profil folgt später im Portal.
              </p>
              <form onSubmit={createOrganization} className="formGrid">
                <label className="full">
                  Vollständiger Firmenname
                  <input
                    name="legalName"
                    required
                    autoComplete="organization"
                    placeholder="Unternehmen inklusive Rechtsform"
                  />
                </label>
                <label className="full">
                  Homepage <small>Optional</small>
                  <input
                    name="websiteUrl"
                    type="url"
                    placeholder="https://www.unternehmen.de"
                  />
                </label>
                <fieldset className="full roleChoice">
                  <legend>Wie möchten Sie B2B Matching nutzen?</legend>
                  <label className={role === "buyer" ? "active" : ""}>
                    <input
                      type="radio"
                      name="role"
                      value="buyer"
                      checked={role === "buyer"}
                      onChange={() => setRole("buyer")}
                    />
                    <span>
                      <b>Dienstleistungen suchen</b>
                      <small>Für Unternehmer dauerhaft kostenlos</small>
                    </span>
                  </label>
                  <label className={role === "provider" ? "active" : ""}>
                    <input
                      type="radio"
                      name="role"
                      value="provider"
                      checked={role === "provider"}
                      onChange={() => setRole("provider")}
                    />
                    <span>
                      <b>Dienstleistungen anbieten</b>
                      <small>
                        Profil kostenlos anlegen, aktive Nutzung später
                        kostenpflichtig
                      </small>
                    </span>
                  </label>
                  <label className={role === "both" ? "active" : ""}>
                    <input
                      type="radio"
                      name="role"
                      value="both"
                      checked={role === "both"}
                      onChange={() => setRole("both")}
                    />
                    <span>
                      <b>Beides</b>
                      <small>
                        Unternehmerfunktionen kostenlos, Dienstleisterfunktionen
                        nach Tarifwahl
                      </small>
                    </span>
                  </label>
                  <label className={role === "network" ? "active" : ""}>
                    <input type="radio" name="role" value="network" checked={role === "network"} onChange={() => setRole("network")}/>
                    <span><b>Unternehmensnetzwerk betreiben</b><small>Eigenen geschlossenen Netzwerkbereich beantragen</small></span>
                  </label>
                </fieldset>
                {role === "network" && <section className="full networkRegistrationFields">
                  <h2>Ihr Unternehmensnetzwerk</h2>
                  <p>Sie erhalten nach Abschluss sofort den administrativen Zugang zu einer unverbindlichen 10-Tage-Testansicht.</p>
                  <label>Bezeichnung des Netzwerks<input name="networkName" required placeholder="z. B. Unternehmerfreunde NRW"/></label>
                  <details className="networkPriceDetails">
                    <summary>
                      <span><b>Netzwerkportal bis 50 Unternehmen</b><small>Preise und Vertragsdetails anzeigen</small></span>
                      <strong>390 € <small>netto / Monat</small></strong>
                    </summary>
                    <div className="networkPriceCard">
                      <p className="networkMonthlyFee"><b>Monatliche Netzwerkpauschale</b><span>390 € netto pro Monat für die Nutzung mit bis zu 50 Mitgliedsunternehmen.</span></p>
                      <ul><li>12 Monate Mindestlaufzeit</li><li>12 Monate im Voraus oder halbjährliche Abrechnung</li><li>Hosting, Wartung, Sicherheits- und Funktionsupdates inklusive</li></ul>
                      <small>Der Test endet nach zehn Tagen automatisch. Es erfolgt keine automatische kostenpflichtige Verlängerung.</small>
                      <p className="networkSetupFee"><span>Einmalige Bereitstellungs- und Servicepauschale</span><strong>2.990 € netto</strong><small>Zusätzlich zur monatlichen Netzwerkpauschale – einmalig für Einrichtung und Bereitstellung des Netzwerkportals.</small></p>
                    </div>
                  </details>
                  <label className="networkConsent"><input type="checkbox" name="networkAuthorized" required/><span>Ich bestätige, dass ich zur Registrierung und Verwaltung dieses Netzwerks entscheidungsberechtigt bin.</span></label>
                  <label className="networkConsent"><input type="checkbox" name="networkResponsibility" required/><span>Ich übernehme die Verantwortung für Einladungen, Mitgliederrechte und die Inhalte des geschlossenen Netzwerkbereichs.</span></label>
                  <label className="networkConsent"><input type="checkbox" name="networkPricing" required/><span>Ich habe die Preise und die Mindestlaufzeit zur Kenntnis genommen. Der kostenpflichtige Vertrag beginnt erst mit einer gesonderten Buchung.</span></label>
                </section>}
                <div className="full pricingClarity">
                  <b>
                    {role === "buyer"
                      ? "Für Unternehmen kostenlos"
                      : role === "provider"
                        ? "Kostenpflichtig erst bei aktiver Dienstleisternutzung"
                        : role === "both" ? "Klare Trennung nach Funktionsbereich" : "10 Tage unverbindliche Netzwerk-Demo"}
                  </b>
                  <p>
                    {role === "buyer"
                      ? "Bedarfe, Matches und Kontaktfreigaben können ohne Mitgliedsbeitrag genutzt werden."
                      : role === "provider"
                        ? "Registrierung und Profilerstellung sind kostenlos. Vor der aktiven Teilnahme wird ein Tarif mit mindestens drei Monaten Laufzeit transparent bestätigt."
                        : role === "both" ? "Die Suche nach Dienstleistern bleibt kostenlos. Für das Anbieten eigener Leistungen gelten später die Dienstleistertarife." : "Sie können alle Netzwerkoberflächen ansehen. Speichern, Einladen und Veröffentlichen werden erst nach der verbindlichen Buchung freigeschaltet."}
                  </p>
                </div>
                <button className="primary full" disabled={loading}>
                  {loading
                    ? "Profil wird vorbereitet …"
                    : "Unternehmen anlegen und fortfahren"}
                </button>
              </form>
            </>
          )}
          {step === "submitted" && (
            <div className="success">
              <div className="check">✓</div>
              <h1>Ihr Zugang ist bereit</h1>
              <p className="lead">
                Das Unternehmen wurde angelegt und zur Prüfung vorgemerkt. Im
                Portal können Sie Ihr Profil jetzt in Ruhe vervollständigen.
              </p>
              <Link className="primary linkButton" href={role === "network" && createdNetworkSlug ? `/portal/netzwerk/${createdNetworkSlug}` as never : routeForRole(role === "network" ? "both" : role)}>
                Zum persönlichen Arbeitsbereich
              </Link>
              <small className="successNote">
                Ihr Profil ist bis zur administrativen Freigabe nicht
                öffentlich.
              </small>
            </div>
          )}
          {message && (
            <p className="error" role="alert">
              {message}
            </p>
          )}
        </section>
      </section>
      <section className="authTrust">
        <div>
          <b>Unternehmen</b>
          <p>
            Dauerhaft kostenlos Bedarfe einstellen und passende Anbieter prüfen.
          </p>
        </div>
        <div>
          <b>Dienstleister</b>
          <p>
            Kostenlos registrieren und Profil vorbereiten; aktive Nutzung nach
            Tarifwahl.
          </p>
        </div>
        <div>
          <b>Beide Rollen</b>
          <p>
            Ein Konto verbindet Suche und Angebot mit getrennten Berechtigungen.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
