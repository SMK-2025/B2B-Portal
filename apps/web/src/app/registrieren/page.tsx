"use client";
import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { useNetworkBrand } from "../components/network-auth-brand";
import { MemberAnnualRegistrationFields } from "../components/member-annual-registration-fields";
import { getPortalSession, portalRequest } from "../lib/portal-api";

type Step = "pricing" | "account" | "verify" | "organization" | "submitted";
type RegisterResult = {
  verificationToken?: string;
  verificationRequired: boolean;
};

export default function RegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pricing"),
    [message, setMessage] = useState(""),
    [verificationToken, setVerificationToken] = useState(""),
    [sessionToken, setSessionToken] = useState(""),
    [loading, setLoading] = useState(false),
    [networkSlug, setNetworkSlug] = useState(""),
    [invitedEmail, setInvitedEmail] = useState(""),
    [networkInviteToken, setNetworkInviteToken] = useState(""),
    [ready, setReady] = useState(false);
  const networkRegistration = Boolean(networkSlug && networkInviteToken),
    networkBrand = useNetworkBrand(networkSlug);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNetworkSlug(params.get("network") || "");
    setInvitedEmail(params.get("email") || "");
    setNetworkInviteToken(params.get("invite") || "");
    if (params.get("onboarding") === "1") {
      const token = getPortalSession();
      if (token) {
        setSessionToken(token);
        setStep("organization");
      }
    }
    setReady(true);
  }, []);
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await portalRequest<RegisterResult>("/auth/register", {
        body: {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          password: form.get("password"),
          networkInviteToken,
        },
      });
      setVerificationToken(result.verificationToken || "");
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
      router.push(
        `/anmelden?network=${encodeURIComponent(networkSlug)}&invite=${encodeURIComponent(networkInviteToken)}` as never,
      );
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
    const form = new FormData(event.currentTarget),
      legalName = String(form.get("legalName"));
    try {
      await portalRequest("/organizations", {
        token: sessionToken,
        body: {
          ...Object.fromEntries(form),
          acceptedMonthlyNetCents: Number(form.get("acceptedMonthlyNetCents")),
          authorityConfirmed: form.get("authorityConfirmed") === "on",
          termsAccepted: form.get("termsAccepted") === "on",
          paymentObligationAccepted:
            form.get("paymentObligationAccepted") === "on",
          legalName,
          displayName: legalName,
          role: "network",
          websiteUrl: form.get("websiteUrl"),
          networkSlug,
          networkInviteToken,
        },
      });
      setStep("submitted");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Die Partnerseite konnte nicht angelegt werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  if (!ready)
    return (
      <main className="networkAccessState">
        <section>
          <span>GESCHÜTZTER ZUGANG</span>
          <h1>Einladung wird geprüft.</h1>
        </section>
      </main>
    );
  if (!networkRegistration)
    return (
      <main className="v2">
        <SiteHeader />
        <section className="authPage loginPage">
          <aside className="authStory">
            <span>PERSÖNLICHER ZUGANG</span>
            <h1>Partnerportale bleiben geschlossen.</h1>
            <p>
              Eine Registrierung ist ausschließlich über die persönliche
              Einladung eines Netzwerk-Initiators möglich.
            </p>
          </aside>
          <section className="authCard authCardV2">
            <p className="sectionKicker">EINLADUNG ERFORDERLICH</p>
            <h2>Kein öffentlicher Zugang</h2>
            <p className="lead">
              Öffnen Sie den vollständigen Einladungslink aus Ihrer E-Mail.
              Möchten Sie ein neues Partnerportal einrichten, sprechen Sie uns
              persönlich an.
            </p>
            <a
              className="primary linkButton wide"
              href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen"
            >
              Partnerportal anfragen
            </a>
            <p className="authHint">
              <Link href="/anmelden">Bereits eingeladen? Zur Anmeldung</Link>
            </p>
          </section>
        </section>
        <SiteFooter />
      </main>
    );
  const stepNumber =
    step === "pricing" ? 1 : step === "account" ? 2 : step === "verify" ? 3 : 4;
  return (
    <main
      className={
        networkBrand
          ? "v2 registrationWizard networkRegistrationBranded"
          : "v2 registrationWizard"
      }
      style={
        networkBrand
          ? ({
              "--auth-primary": networkBrand.primaryColor,
              "--auth-secondary": networkBrand.secondaryColor,
            } as CSSProperties)
          : undefined
      }
    >
      {networkBrand ? (
        <header className="networkAuthHeader">
          <Link
            href={
              `/anmelden?network=${encodeURIComponent(networkBrand.slug)}` as never
            }
          >
            {networkBrand.logoUrl ? (
              <img
                src={networkBrand.logoUrl}
                alt={`${networkBrand.name} Logo`}
              />
            ) : (
              <span>{networkBrand.name.slice(0, 2).toUpperCase()}</span>
            )}
            <div>
              <b>{networkBrand.name}</b>
              <small>Geschütztes Partnerportal</small>
            </div>
          </Link>
          <em>Persönliche Einladung</em>
        </header>
      ) : (
        <SiteHeader />
      )}
      <section className="authPage">
        <aside
          className={`authStory registrationStory${step === "organization" ? " registrationBillingStory" : ""}`}
        >
          {step === "organization" ? (
            <MemberAnnualRegistrationFields
              invite={networkInviteToken}
              loading={loading}
              priceOnly
            />
          ) : (
            <>
              <span>
                {networkBrand
                  ? `IHR START BEI ${networkBrand.name.toUpperCase()}`
                  : "IHR PARTNERPORTAL-ZUGANG"}
              </span>
              <h2>
                Gemeinsam mehr erreichen.
                <br />
                Persönlich verbunden.
              </h2>
              <p>
                Lerne die Menschen hinter den Unternehmen kennen und bleib auch
                zwischen gemeinsamen Treffen im Gespräch. Teile Ideen, stell
                dein Angebot vor und finde neue Kontakte – persönlich und
                geschützt innerhalb unserer Partnergemeinschaft.
              </p>
              <div className="authBenefits">
                <article>
                  <b>01</b>
                  <div>
                    <strong>Mitgliedschaft kennenlernen</strong>
                    <p>
                      Preis und Leistungen prüfen und Ihren persönlichen Zugang
                      erstellen.
                    </p>
                  </div>
                </article>
                <article>
                  <b>02</b>
                  <div>
                    <strong>Persönlich verbunden bleiben</strong>
                    <p>
                      Kontakte vertiefen, Nachrichten austauschen und gemeinsame
                      Treffen planen.
                    </p>
                  </div>
                </article>
                <article>
                  <b>03</b>
                  <div>
                    <strong>Gemeinsam Chancen nutzen</strong>
                    <p>
                      Kompetenzen entdecken, Angebote abstimmen und aus
                      Begegnungen nachhaltige Geschäftsbeziehungen entwickeln.
                    </p>
                  </div>
                </article>
              </div>
              <small>
                ✓ Keine offene Registrierung &nbsp; ✓ Keine öffentliche
                Partnerseite &nbsp; ✓ Strikt getrennter Netzwerkbereich
              </small>
            </>
          )}
        </aside>
        <section className="authCard authCardV2">
          <div
            className="registrationProgress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={stepNumber}
            aria-label={`Schritt ${stepNumber} von 4`}
          >
            <span style={{ width: `${stepNumber * 25}%` }} />
            <small>SCHRITT {stepNumber} VON 4</small>
          </div>
          {step === "pricing" && (
            <>
              <h1>Deine Einladung. Dein Netzwerk.</h1>
              <MemberAnnualRegistrationFields
                invite={networkInviteToken}
                loading={loading}
                summaryOnly
                onContinue={() => setStep("account")}
              />
            </>
          )}
          {step === "account" && (
            <>
              <h1>Partnerportal-Zugang erstellen</h1>
              <button
                type="button"
                className="registrationBack"
                onClick={() => setStep("pricing")}
              >
                ← Preisübersicht erneut ansehen
              </button>
              <p className="lead">
                Die eingeladene E-Mail-Adresse ist verbindlich vorgegeben.
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
                    value={invitedEmail}
                    readOnly
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
                    pattern="(?=.*[a-zäöüß])(?=.*[A-ZÄÖÜ])(?=.*[0-9])(?=.*[^A-Za-zÄÖÜäöüß0-9]).{12,}"
                    title="Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben, Zahl und Sonderzeichen"
                    autoComplete="new-password"
                  />
                  <small>
                    Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben, Zahl
                    und Sonderzeichen
                  </small>
                </label>
                <label className="full legalConsent">
                  <input type="checkbox" required />
                  <span>
                    Ich akzeptiere die{" "}
                    <Link href="/agb" target="_blank">
                      AGB und Nutzungsregeln
                    </Link>{" "}
                    sowie die{" "}
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
              <p>
                Bereits ein Konto?{" "}
                <Link
                  href={
                    `/anmelden?network=${encodeURIComponent(networkSlug)}&invite=${encodeURIComponent(networkInviteToken)}` as never
                  }
                >
                  Mit bestehendem Zugang anmelden und Einladung fortsetzen
                </Link>
              </p>
            </>
          )}
          {step === "verify" && (
            <>
              <h1>E-Mail bestätigen</h1>
              <p className="lead">
                Wir haben einen persönlichen Bestätigungslink an Ihre
                geschäftliche E-Mail-Adresse gesendet.
              </p>
              <div className="verificationNotice">
                <b>Bitte prüfen Sie Ihr Postfach</b>
                <p>
                  Der Link ist 24 Stunden gültig. Schauen Sie bei Bedarf auch in
                  Ihren Spam-Ordner.
                </p>
                <p>
                  Danach geht es mit der Anmeldung und Schritt 4 weiter:
                  Unternehmen, Rechnungsdaten und verbindliche Jahresbuchung.
                  Die E-Mail-Bestätigung allein schließt keine Buchung ab.
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
                <Link
                  className="primary linkButton wide"
                  href={
                    `/anmelden?network=${encodeURIComponent(networkSlug)}&invite=${encodeURIComponent(networkInviteToken)}` as never
                  }
                >
                  Zur Anmeldung
                </Link>
              )}
            </>
          )}
          {step === "organization" && (
            <>
              <h1>Unternehmen & Jahresmitgliedschaft</h1>
              <p className="lead">
                Prüfen Sie den verbindlichen Preis und ergänzen Sie Ihre
                Rechnungsdaten. Danach nutzen Sie alle Funktionen Ihres
                geschlossenen Partnerportals sofort.
              </p>
              <form onSubmit={createOrganization} className="formGrid">
                <label className="full">
                  Vollständiger Firmenname / Rechnungsempfänger
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
                <MemberAnnualRegistrationFields
                  invite={networkInviteToken}
                  loading={loading}
                  hidePrice
                />
              </form>
            </>
          )}
          {step === "submitted" && (
            <div className="success">
              <div className="check">✓</div>
              <h1>Ihr Zugang ist bereit</h1>
              <p className="lead">
                Willkommen in Ihrem geschlossenen Partnerportal.
              </p>
              <Link
                className="primary linkButton"
                href={`/portal/netzwerk/${networkSlug}` as never}
              >
                Zum Partnerportal
              </Link>
            </div>
          )}
          {message && (
            <p className="error" role="alert">
              {message}
            </p>
          )}
        </section>
      </section>
      {networkBrand ? (
        <footer className="networkAuthFooter">
          <span>
            © {new Date().getFullYear()} Media Online Innovations Group
          </span>
          <nav aria-label="Rechtliche Informationen">
            <Link href="/impressum" target="_blank" rel="noopener noreferrer">
              Impressum
            </Link>
            <Link
              href="/datenschutz/unternehmen"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutz
            </Link>
            <Link href="/agb" target="_blank" rel="noopener noreferrer">
              AGB
            </Link>
          </nav>
        </footer>
      ) : (
        <SiteFooter />
      )}
    </main>
  );
}
