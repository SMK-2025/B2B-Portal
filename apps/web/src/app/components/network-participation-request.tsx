"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { portalRequest } from "../lib/portal-api";
export function NetworkParticipationRequest() {
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await portalRequest("/networks/participation/request", {
        body: {
          network: "bayer04leverkusen",
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          password: form.get("password"),
          company: form.get("company"),
          affiliation: form.get("affiliation"),
          accurate: form.get("accurate") === "on",
        },
      });
      setSent(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Die Anfrage konnte nicht gesendet werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <section role="status">
        <h1>Danke für deine Teilnahmeanfrage.</h1>
        <p>
          Bitte bestätige deine E-Mail-Adresse über den zugesandten Link. Wir
          prüfen anschließend deine Zugehörigkeit. Bis zur Freigabe sind keine
          Netzwerkinhalte oder Funktionen verfügbar.
        </p>
        <p>
          Nach der Freigabe erhältst du deinen persönlichen Link, bestätigst die
          geltenden Konditionen und richtest deine Unternehmensseite ein.
        </p>
      </section>
    );
  return (
    <>
      <h1>Teilnahme anfragen</h1>
      <p>
        Lerne Menschen und Unternehmen aus deinem Business-Netzwerk kennen. Wir
        prüfen deine Zugehörigkeit vor der Freischaltung.
      </p>
      <form className="formGrid" onSubmit={submit}>
        <label>
          Vorname
          <input
            name="firstName"
            required
            minLength={2}
            maxLength={100}
            autoComplete="given-name"
          />
        </label>
        <label>
          Nachname
          <input
            name="lastName"
            required
            minLength={2}
            maxLength={100}
            autoComplete="family-name"
          />
        </label>
        <label className="full">
          Unternehmen
          <input
            name="company"
            required
            minLength={2}
            maxLength={200}
            autoComplete="organization"
          />
        </label>
        <label className="full">
          Geschäftliche E-Mail-Adresse
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="full">
          Passwort
          <input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={200}
            autoComplete="new-password"
          />
          <small>
            Mindestens 12 Zeichen, mit Groß- und Kleinbuchstaben, Zahl und
            Sonderzeichen. Wenn du bereits ein Konto hast, verwende dein
            bestehendes Passwort.
          </small>
        </label>
        <label className="full">
          Dein Bezug zum Business-Bereich
          <select name="affiliation" required defaultValue="">
            <option value="" disabled>
              Bitte auswählen
            </option>
            <option>Hospitality-/VIP-Gast</option>
            <option>Unternehmenspartner/Sponsor</option>
            <option>Sonstiger Bezug</option>
          </select>
        </label>
        <label className="full legalConsent">
          <input name="accurate" type="checkbox" required />
          <span>
            Ich bestätige, dass meine Angaben korrekt sind. Mein Zugang wird
            erst nach Prüfung freigeschaltet.
          </span>
        </label>
        <p className="full">
          Die Anfrage ist noch keine kostenpflichtige Buchung. Nach Freigabe
          gelten die Konditionen des Netzwerks. Hinweise zur Verarbeitung deiner
          Angaben findest du im{" "}
          <Link href="/datenschutz/unternehmen" target="_blank">
            Datenschutz
          </Link>
          .
        </p>
        {error && (
          <p className="error full" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? "Anfrage wird gesendet …" : "Teilnahme anfragen"}
        </button>
      </form>
    </>
  );
}
