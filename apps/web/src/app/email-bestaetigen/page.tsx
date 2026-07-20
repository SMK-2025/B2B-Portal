"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { portalRequest } from "../lib/portal-api";

function Confirmation() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setMessage("Der Bestätigungscode fehlt.");
      setState("error");
      return;
    }
    portalRequest("/auth/verify-email", { body: { token } })
      .then(() => setState("success"))
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Der Link konnte nicht bestätigt werden.",
        );
        setState("error");
      });
  }, [token]);

  if (state === "loading")
    return (
      <>
        <h1>E-Mail wird bestätigt</h1>
        <p className="lead">Bitte warten Sie einen kurzen Moment.</p>
      </>
    );
  if (state === "success")
    return (
      <div className="success">
        <div className="check">✓</div>
        <h1>E-Mail bestätigt</h1>
        <p className="lead">
          Ihr Zugang ist aktiviert. Sie können sich jetzt sicher anmelden.
        </p>
        <Link className="primary linkButton" href="/anmelden">
          Jetzt anmelden
        </Link>
      </div>
    );
  return (
    <>
      <h1>Bestätigung nicht möglich</h1>
      <p className="error" role="alert">
        {message}
      </p>
      <Link className="primary linkButton" href="/registrieren">
        Erneut registrieren
      </Link>
    </>
  );
}

export default function EmailBestaetigenPage() {
  return (
    <main className="v2">
      <SiteHeader />
      <section className="authPage loginPage">
        <aside className="authStory">
          <span>SICHERER ZUGANG</span>
          <h1>Ein Klick bis zu Ihrem Unternehmensnetzwerk.</h1>
          <p>
            Die Bestätigung schützt Unternehmenskonten und stellt sicher, dass
            Benachrichtigungen zuverlässig ankommen.
          </p>
        </aside>
        <section className="authCard authCardV2">
          <p className="sectionKicker">E-MAIL-PRÜFUNG</p>
          <Suspense
            fallback={<p className="lead">Bestätigungslink wird geprüft …</p>}
          >
            <Confirmation />
          </Suspense>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
