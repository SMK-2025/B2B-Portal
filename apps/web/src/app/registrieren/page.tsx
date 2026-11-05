"use client";
import "./registration-header.css";
import { NetworkText } from "../components/network-text-editor";
import { authorizedMailingToken } from "../lib/mailing-token";
import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { useNetworkBrand } from "../components/network-auth-brand";
import { MemberAnnualRegistrationFields } from "../components/member-annual-registration-fields";
import { PartnerLoginForm } from "../components/partner-login-form";
import { NetworkParticipationRequest } from "../components/network-participation-request";
import {
  getPortalSession,
  portalRequest,
  savePortalSession,
} from "../lib/portal-api";

type Step = "pricing" | "account" | "verify" | "organization" | "submitted";
type RegisterResult = {
  token?: string;
  verificationToken?: string;
  verificationRequired: boolean;
};

export default function RegistrationPage() {
  const router = useRouter();
  const [paymentModel, setPaymentModel] = useState<
    "individual" | "network" | null
  >(null);
  const centralPayment = paymentModel !== "individual";
  const [step, setStep] = useState<Step>("pricing"),
    [loginMode, setLoginMode] = useState(false),
    [message, setMessage] = useState(""),
    [verificationToken, setVerificationToken] = useState(""),
    [sessionToken, setSessionToken] = useState(""),
    [loading, setLoading] = useState(false),
    [networkSlug, setNetworkSlug] = useState(""),
    [invitedEmail, setInvitedEmail] = useState(""),
    [emailLocked, setEmailLocked] = useState(false),
    [networkInviteToken, setNetworkInviteToken] = useState(""),
    [ready, setReady] = useState(false);
  const acceptsRequests = [
    "unternehmerfreunde",
    "bayer04leverkusen",
    "unternehmernetzwerkleverkusen",
    "unternehmernetzwerkkoeln",
  ].includes(networkSlug);
  const cityNetwork = [
    "unternehmernetzwerkleverkusen",
    "unternehmernetzwerkkoeln",
  ].includes(networkSlug);
  const cityName =
    networkSlug === "unternehmernetzwerkkoeln" ? "Köln" : "Leverkusen";
  const networkRegistration = Boolean(networkSlug && networkInviteToken),
    networkBrand = useNetworkBrand(networkSlug);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLoginMode(params.get("mode") === "login");
    const requestedNetwork = params.get("network") || "";
    setNetworkSlug(
      requestedNetwork === "unternehmernetzwerk-leverkusen"
        ? "unternehmernetzwerkleverkusen"
        : requestedNetwork,
    );
    setInvitedEmail(params.get("email") || "");
    setEmailLocked(Boolean(params.get("email")));
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
      let invite = networkInviteToken;
      if (!emailLocked) {
        const result = await portalRequest<{ invite: string }>(
          "/networks/invitations/shared-resolve",
          { body: { invite, email: form.get("email") } },
        );
        invite = result.invite;
        setNetworkInviteToken(invite);
        setEmailLocked(true);
        const url = new URL(window.location.href);
        url.searchParams.set("invite", invite);
        url.searchParams.set("email", String(form.get("email")));
        window.history.replaceState(null, "", url);
      }
      const result = await portalRequest<RegisterResult>("/auth/register", {
        body: {
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          password: form.get("password"),
          networkInviteToken: invite,
          mailingToken: authorizedMailingToken(),
        },
      });
      if (result.token && !result.verificationRequired) {
        savePortalSession(result.token, false);
        setSessionToken(result.token);
        setStep("organization");
        return;
      }
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
          launchPromotionAccepted: form.get("launchPromotionAccepted"),
          legalName,
          displayName: legalName,
          role: "network",
          websiteUrl: form.get("websiteUrl"),
          networkSlug,
          networkInviteToken,
        },
      });
      router.replace(
        `/portal/netzwerk/${encodeURIComponent(networkSlug)}/profil?einrichten=1` as never,
      );
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
          <span>
            <NetworkText id="ui.page.5afcbdd28f60c743">
              GESCHÜTZTER ZUGANG
            </NetworkText>
          </span>
          <h1>
            <NetworkText id="ui.page.67600f4b82400b9a">
              Einladung wird geprüft.
            </NetworkText>
          </h1>
        </section>
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
        <header
          className={`networkAuthHeader${acceptsRequests ? " networkAuthHeaderSimple" : ""}`}
        >
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
              <b>
                <NetworkText id="ui.portal.name">
                  {networkBrand.slug === "bayer04leverkusen"
                    ? "Das Netzwerkpartner-Portal"
                    : networkBrand.name}
                </NetworkText>
              </b>
              <small>
                <NetworkText id="ui.portal.auth-subtitle">
                  {networkBrand.slug === "bayer04leverkusen"
                    ? "der Media Online Innovations Group"
                    : "Geschütztes Partnerportal"}
                </NetworkText>
              </small>
            </div>
          </Link>
          {!acceptsRequests && (
            <em>
              <NetworkText id="ui.page.7cc1fa36f7c99b7e">
                Persönliche Einladung
              </NetworkText>
            </em>
          )}
        </header>
      ) : (
        <SiteHeader />
      )}
      <section className="authPage">
        <aside
          className={`authStory registrationStory${step === "organization" ? " registrationBillingStory" : ""}`}
        >
          {step === "organization" && !loginMode ? (
            <MemberAnnualRegistrationFields
              invite={networkInviteToken}
              loading={loading}
              priceOnly
              onPaymentModel={setPaymentModel}
            />
          ) : (
            <>
              <span>
                <NetworkText id="ui.auth.eyebrow">
                  {networkBrand?.slug === "bayer04leverkusen"
                    ? "UNABHÄNGIG. INHABERGEFÜHRT. PERSÖNLICH."
                    : networkBrand
                      ? `IHR START BEI ${networkBrand.name.toUpperCase()}`
                      : "IHR PARTNERPORTAL-ZUGANG"}
                </NetworkText>
              </span>
              <h2>
                <NetworkText
                  id={
                    cityNetwork
                      ? "ui.auth.leverkusen.story-title-first"
                      : "ui.page.bbdf4d619209c904"
                  }
                >
                  {cityNetwork
                    ? "Eine Stadt voller Unternehmen."
                    : "Gemeinsam mehr erreichen."}
                </NetworkText>
                <br />
                <NetworkText
                  id={
                    cityNetwork
                      ? "ui.auth.leverkusen.story-title-second"
                      : "ui.page.640b8e17ea4832d0"
                  }
                >
                  {cityNetwork
                    ? "Und du bist mittendrin!"
                    : "Persönlich verbunden."}
                </NetworkText>
              </h2>
              <p>
                {cityNetwork ? (
                  <NetworkText id="ui.auth.leverkusen.story-intro">
                    <strong>
                      Das Unternehmernetzwerk {cityName} ist dein
                      Online-Treffpunkt für geschäftliche Kontakte vor Ort.
                    </strong>{" "}
                    Ein unabhängiges B2B-Netzwerk, in dem du dein Unternehmen
                    vorstellst, passende Leistungen findest und neue
                    Verbindungen aufbaust. So einfach war das Netzwerken noch
                    nie.
                  </NetworkText>
                ) : networkBrand?.slug === "bayer04leverkusen" ? (
                  <NetworkText id="ui.auth.story-intro">
                    Lerne Menschen und Unternehmen aus deinem Business-Netzwerk
                    kennen, entdecke Angebote und Leistungen und komm direkt ins
                    Gespräch – auch zwischen den gemeinsamen Treffen.
                  </NetworkText>
                ) : (
                  <>
                    <NetworkText id="ui.page.1055b48a5d6aeb77">
                      Lerne die Menschen hinter den Unternehmen kennen und bleib
                      auch zwischen gemeinsamen Treffen im Gespräch. Teile
                      Ideen, stell dein Angebot vor und finde neue Kontakte –
                      persönlich und geschützt innerhalb unserer
                      Partnergemeinschaft.
                    </NetworkText>
                  </>
                )}
              </p>
              {cityNetwork ? (
                <p>
                  <NetworkText id="ui.auth.leverkusen.story-action">
                    Registriere dich und erstelle deine persönliche
                    Unternehmens-Seite.
                  </NetworkText>
                </p>
              ) : (
                <>
                  <div className="authBenefits">
                    <article>
                      <b>01</b>
                      <div>
                        <strong>
                          <NetworkText id="ui.page.94ddedde22fbc5f4">
                            {centralPayment
                              ? "Netzwerk kennenlernen"
                              : "Mitgliedschaft kennenlernen"}
                          </NetworkText>
                        </strong>
                        <p>
                          <NetworkText id="ui.page.002a2e08b02edfbd">
                            {centralPayment
                              ? "Deinen persönlichen Zugang erstellen und die Partner im Netzwerk entdecken."
                              : "Preis und Leistungen prüfen und Ihren persönlichen Zugang erstellen."}
                          </NetworkText>
                        </p>
                      </div>
                    </article>
                    <article>
                      <b>02</b>
                      <div>
                        <strong>
                          <NetworkText id="ui.page.b122adc74576f92f">
                            Persönlich verbunden bleiben
                          </NetworkText>
                        </strong>
                        <p>
                          <NetworkText id="ui.page.e42183dfdd0e9f49">
                            Kontakte vertiefen, Nachrichten austauschen und
                            gemeinsame Treffen planen.
                          </NetworkText>
                        </p>
                      </div>
                    </article>
                    <article>
                      <b>03</b>
                      <div>
                        <strong>
                          <NetworkText id="ui.page.4a8470d2e1097b5e">
                            Gemeinsam Chancen nutzen
                          </NetworkText>
                        </strong>
                        <p>
                          <NetworkText id="ui.page.e78a0ef6793d58ab">
                            Kompetenzen entdecken, Angebote abstimmen und aus
                            Begegnungen nachhaltige Geschäftsbeziehungen
                            entwickeln.
                          </NetworkText>
                        </p>
                      </div>
                    </article>
                  </div>
                  <small>
                    <NetworkText id="ui.page.215f1992e92e4077">
                      ✓ Keine offene Registrierung &nbsp; ✓ Keine öffentliche
                      Partnerseite &nbsp; ✓ Strikt getrennter Netzwerkbereich
                    </NetworkText>
                  </small>
                </>
              )}
            </>
          )}
        </aside>
        <section className="authCard authCardV2">
          <nav className="authModeSwitch" aria-label="Zugang wählen">
            <button
              type="button"
              aria-pressed={loginMode}
              onClick={() => {
                setLoginMode(true);
                const url = new URL(window.location.href);
                url.searchParams.set("mode", "login");
                window.history.replaceState(null, "", url);
              }}
            >
              <NetworkText id="ui.page.a329a32263a460ff">Anmelden</NetworkText>
            </button>
            <button
              type="button"
              aria-pressed={!loginMode}
              onClick={() => {
                setLoginMode(false);
                const url = new URL(window.location.href);
                url.searchParams.delete("mode");
                window.history.replaceState(null, "", url);
              }}
            >
              <NetworkText id="ui.page.3badc984343995c1">
                Registrieren
              </NetworkText>
            </button>
          </nav>
          {loginMode ? (
            <PartnerLoginForm
              networkSlug={networkSlug}
              invite={networkInviteToken}
              email={invitedEmail}
              onOnboarding={(token, invite) => {
                setNetworkInviteToken(invite);
                setSessionToken(token);
                setStep("organization");
                setLoginMode(false);
                const url = new URL(window.location.href);
                url.searchParams.delete("mode");
                url.searchParams.set("onboarding", "1");
                url.searchParams.set("invite", invite);
                window.history.replaceState(null, "", url);
              }}
            />
          ) : !networkRegistration && acceptsRequests ? (
            <NetworkParticipationRequest
              key={networkSlug}
              network={networkSlug}
            />
          ) : !networkRegistration ? (
            <>
              <h1>
                <NetworkText id="ui.page.7008a37f2773cea4">
                  Persönliche Einladung erforderlich
                </NetworkText>
              </h1>
              <p className="lead">
                <NetworkText id="ui.page.5f2a467cedf8bf85">
                  Öffne zur Registrierung den vollständigen Einladungslink aus
                  deiner E-Mail. Bestehende Zugänge können sich hier direkt
                  anmelden.
                </NetworkText>
              </p>
            </>
          ) : (
            <>
              <div
                className="registrationProgress"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={4}
                aria-valuenow={stepNumber}
                aria-label={`Schritt ${stepNumber} von 4`}
              >
                <span style={{ width: `${stepNumber * 25}%` }} />
                <small>
                  <NetworkText id="ui.page.d464c756534a396a">
                    SCHRITT{" "}
                  </NetworkText>
                  {stepNumber}
                  <NetworkText id="ui.page.52b1ba331ccbeef1">VON 4</NetworkText>
                </small>
              </div>
              {step === "pricing" && (
                <>
                  <h1>
                    <NetworkText id="ui.page.375a1da993c371ec">
                      Deine Einladung. Dein Netzwerk.
                    </NetworkText>
                  </h1>
                  <MemberAnnualRegistrationFields
                    invite={networkInviteToken}
                    loading={loading}
                    summaryOnly
                    onPaymentModel={setPaymentModel}
                    onContinue={() => setStep("account")}
                  />
                </>
              )}
              {step === "account" && (
                <>
                  <h1>
                    <NetworkText id="ui.page.8cc1f38d97cc7eec">
                      Partnerportal-Zugang erstellen
                    </NetworkText>
                  </h1>
                  <button
                    type="button"
                    className="registrationBack"
                    onClick={() => setStep("pricing")}
                  >
                    <NetworkText id="ui.page.9ed1d16a1f6a379f">
                      {centralPayment
                        ? "← Einladung erneut ansehen"
                        : "← Preisübersicht erneut ansehen"}
                    </NetworkText>
                  </button>
                  <p className="lead">
                    <NetworkText id="ui.page.55bdd66c96f8b360">
                      {emailLocked
                        ? "Die eingeladene E-Mail-Adresse ist verbindlich vorgegeben."
                        : "Gib deine geschäftliche E-Mail-Adresse für deinen persönlichen Zugang an."}
                    </NetworkText>
                  </p>
                  <form onSubmit={register} className="formGrid">
                    <label>
                      <NetworkText id="ui.page.d2d77b6ffa7084f7">
                        Vorname
                      </NetworkText>
                      <input
                        name="firstName"
                        required
                        minLength={2}
                        autoComplete="given-name"
                      />
                    </label>
                    <label>
                      <NetworkText id="ui.page.b25358edd497f128">
                        Nachname
                      </NetworkText>
                      <input
                        name="lastName"
                        required
                        minLength={2}
                        autoComplete="family-name"
                      />
                    </label>
                    <label className="full">
                      <NetworkText id="ui.page.57f639dbdaa8c1c6">
                        Geschäftliche E-Mail
                      </NetworkText>
                      <input
                        name="email"
                        type="email"
                        required
                        value={invitedEmail}
                        readOnly={emailLocked}
                        onChange={(event) =>
                          setInvitedEmail(event.target.value)
                        }
                        autoComplete="email"
                      />
                    </label>
                    <label className="full">
                      <NetworkText id="ui.page.a36c101570cc4410">
                        Passwort
                      </NetworkText>
                      <small>
                        <NetworkText id="ui.page.fd868cd7e73bcd47">
                          Schon ein Konto? Verwende dein bestehendes Passwort –
                          dieselbe E-Mail-Adresse ist in mehreren Netzwerken
                          möglich.
                        </NetworkText>
                      </small>
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
                        <NetworkText id="ui.page.fded167ac3e6726c">
                          Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben,
                          Zahl und Sonderzeichen
                        </NetworkText>
                      </small>
                    </label>
                    <label className="full legalConsent">
                      <input type="checkbox" required />
                      <span>
                        Ich akzeptiere die{" "}
                        <Link href="/agb" target="_blank">
                          AGB und Nutzungsregeln
                        </Link>{" "}
                        <NetworkText id="ui.page.1248c7854f0011f5">
                          sowie die
                        </NetworkText>{" "}
                        <Link href="/datenschutz/unternehmen" target="_blank">
                          Datenschutzerklärung
                        </Link>
                        .
                      </span>
                    </label>
                    <button className="primary full" disabled={loading}>
                      <NetworkText id="ui.page.bdfe31d0bb3c2830">
                        {loading ? "Konto wird erstellt …" : "Konto erstellen"}
                      </NetworkText>
                    </button>
                  </form>
                  <p>
                    <NetworkText id="ui.page.82b80f5e2f59bc49">
                      Bereits ein Konto?
                    </NetworkText>{" "}
                    <Link
                      href={
                        `/anmelden?network=${encodeURIComponent(networkSlug)}&invite=${encodeURIComponent(networkInviteToken)}` as never
                      }
                    >
                      <NetworkText id="ui.page.f7ac1da980c3e3b7">
                        Mit bestehendem Zugang anmelden und Einladung fortsetzen
                      </NetworkText>
                    </Link>
                  </p>
                </>
              )}
              {step === "verify" && (
                <>
                  <h1>
                    <NetworkText id="ui.page.7b3fe21df24bee13">
                      E-Mail bestätigen
                    </NetworkText>
                  </h1>
                  <p className="lead">
                    <NetworkText id="ui.page.6b95d242c3e55b37">
                      Wir haben einen persönlichen Bestätigungslink an Ihre
                      geschäftliche E-Mail-Adresse gesendet.
                    </NetworkText>
                  </p>
                  <div className="verificationNotice">
                    <b>
                      <NetworkText id="ui.page.730bab0535c25a5a">
                        Bitte prüfen Sie Ihr Postfach
                      </NetworkText>
                    </b>
                    <p>
                      <NetworkText id="ui.page.6d10709491c2e3e8">
                        Der Link ist 24 Stunden gültig. Schauen Sie bei Bedarf
                        auch in Ihren Spam-Ordner.
                      </NetworkText>
                    </p>
                    <p>
                      {centralPayment ? (
                        "Danach meldest du dich an und ergänzt dein Unternehmen. Anschließend ist dein Partnerzugang bereit."
                      ) : (
                        <>
                          Danach geht es mit der Anmeldung und Schritt 4 weiter:
                          Unternehmen, Rechnungsdaten und verbindliche
                          Jahresbuchung. Die E-Mail-Bestätigung allein schließt
                          keine Buchung ab.
                        </>
                      )}
                    </p>
                  </div>
                  {verificationToken ? (
                    <button
                      className="primary wide"
                      onClick={verify}
                      disabled={loading}
                    >
                      <NetworkText id="ui.page.d5f55d2276026131">
                        {loading
                          ? "E-Mail wird bestätigt …"
                          : "Testbestätigung ausführen"}
                      </NetworkText>
                    </button>
                  ) : (
                    <Link
                      className="primary linkButton wide"
                      href={
                        `/anmelden?network=${encodeURIComponent(networkSlug)}&invite=${encodeURIComponent(networkInviteToken)}` as never
                      }
                    >
                      <NetworkText id="ui.page.7977d98eb1119660">
                        Zur Anmeldung
                      </NetworkText>
                    </Link>
                  )}
                </>
              )}
              {step === "organization" && (
                <>
                  <h1>
                    <NetworkText id="ui.page.344eae7f3aee013b">
                      {centralPayment
                        ? "Dein Unternehmen"
                        : "Unternehmen & Jahresmitgliedschaft"}
                    </NetworkText>
                  </h1>
                  <p className="lead">
                    {centralPayment ? (
                      "Ergänze dein Unternehmen und starte in deinem geschlossenen Partnernetzwerk."
                    ) : (
                      <>
                        Prüfen Sie den verbindlichen Preis und ergänzen Sie Ihre
                        Rechnungsdaten. Danach nutzen Sie alle Funktionen Ihres
                        geschlossenen Partnerportals sofort.
                      </>
                    )}
                  </p>
                  <form onSubmit={createOrganization} className="formGrid">
                    <label className="full">
                      {centralPayment
                        ? "Vollständiger Firmenname"
                        : "Vollständiger Firmenname / Rechnungsempfänger"}
                      <input
                        name="legalName"
                        required
                        autoComplete="organization"
                        placeholder="Unternehmen inklusive Rechtsform"
                      />
                    </label>
                    <label className="full">
                      <NetworkText id="ui.page.9e3391e9bf072ad3">
                        Homepage{" "}
                      </NetworkText>
                      <small>
                        <NetworkText id="ui.page.59be71333c960fd0">
                          Optional
                        </NetworkText>
                      </small>
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
                      onPaymentModel={setPaymentModel}
                    />
                  </form>
                </>
              )}
              {step === "submitted" && (
                <div className="success">
                  <div className="check">✓</div>
                  <h1>
                    <NetworkText id="ui.page.2d1b39746ad0b616">
                      Ihr Zugang ist bereit
                    </NetworkText>
                  </h1>
                  <p className="lead">
                    <NetworkText id="ui.page.021b8979ff9e5741">
                      Willkommen in Ihrem geschlossenen Partnerportal.
                    </NetworkText>
                  </p>
                  <Link
                    className="primary linkButton"
                    href={`/portal/netzwerk/${networkSlug}` as never}
                  >
                    <NetworkText id="ui.page.97cb6eaa05fc0f1d">
                      Zum Partnerportal
                    </NetworkText>
                  </Link>
                </div>
              )}
              {message && (
                <p className="error" role="alert">
                  {message}
                </p>
              )}
            </>
          )}
        </section>
      </section>
      {networkBrand ? (
        <footer className="networkAuthFooter">
          <span>
            © {new Date().getFullYear()}
            <NetworkText id="ui.page.30249e90338cc672">
              Media Online Innovations Group
            </NetworkText>
          </span>
          <nav aria-label="Rechtliche Informationen">
            <Link href="/impressum" target="_blank" rel="noopener noreferrer">
              <NetworkText id="ui.page.b8a6051923e6a649">Impressum</NetworkText>
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
