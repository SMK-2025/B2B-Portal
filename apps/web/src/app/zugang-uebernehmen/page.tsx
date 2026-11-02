"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import {
  NetworkAuthFrame,
  useNetworkBrand,
} from "../components/network-auth-brand";
import { portalRequest } from "../lib/portal-api";
export default function Handover() {
  const token = useRef("");
  const [slug, setSlug] = useState(""),
    [done, setDone] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const u = new URL(location.href);
    setSlug(u.searchParams.get("network") || "");
    if (u.hash) {
      token.current = new URLSearchParams(u.hash.slice(1)).get("token") || "";
      u.hash = "";
      history.replaceState(null, "", u);
    }
    if (!token.current)
      setError(
        "Link unvollständig. Bitte öffne den aktuellen Link aus deiner Übergabemail.",
      );
  }, []);
  const brand = useNetworkBrand(slug);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    if (f.get("password") !== f.get("confirmation")) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      await portalRequest("/networks/service-members/claim", {
        body: {
          network: slug,
          token: token.current,
          password: f.get("password"),
          confirmation: f.get("confirmation"),
        },
      });
      token.current = "";
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Übernahme fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const content = (
    <>
      <h1>
        {done ? "Dein Zugang ist bereit" : "Deine Partnerseite ist vorbereitet"}
      </h1>
      {done ? (
        <>
          <p>
            Melde dich an, um deinen Entwurf zu prüfen. Erst du veröffentlichst
            deine Partnerseite.
          </p>
          <Link
            className="primary linkButton"
            href={
              `/registrieren?network=${encodeURIComponent(slug)}&mode=login` as never
            }
          >
            Zum Netzwerk anmelden
          </Link>
        </>
      ) : (
        <form className="formGrid" onSubmit={submit}>
          <p className="full">
            Erstelle dein persönliches Passwort. Verwende mindestens zwölf
            Zeichen mit Groß- und Kleinbuchstaben, Zahl und Sonderzeichen.
          </p>
          {[
            ["password", "Passwort erstellen"],
            ["confirmation", "Passwort wiederholen"],
          ].map(([key, label]) => (
            <label className="full" key={key}>
              {label}
              <input
                type="password"
                name={key}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={200}
              />
            </label>
          ))}
          <button className="primary full" disabled={!token.current || busy}>
            Passwort speichern
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
  return brand ? (
    <NetworkAuthFrame kind="login" brand={brand}>
      {content}
    </NetworkAuthFrame>
  ) : (
    <main className="v2">
      <section className="authCard authCardV2">{content}</section>
    </main>
  );
}
