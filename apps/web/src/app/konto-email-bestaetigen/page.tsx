"use client";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { clearPortalSession, portalRequest } from "../lib/portal-api";
import {
  NetworkAuthFrame,
  useNetworkBrand,
} from "../components/network-auth-brand";
import { SiteHeader, SiteFooter } from "../components/site-chrome";
function Confirm() {
  const params = useSearchParams(),
    token = params.get("token") || "",
    slug = params.get("network") || "",
    brand = useNetworkBrand(slug),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      await portalRequest("/auth/email-change/confirm", {
        body: { token, currentPassword: form.get("currentPassword") },
      });
      clearPortalSession();
      setDone(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Bestätigung nicht möglich.");
    } finally {
      setBusy(false);
    }
  }
  const body = (
    <section className="authCard authCardV2">
      <h2>
        {done ? "Login-Adresse geändert" : "Neue Login-Adresse bestätigen"}
      </h2>
      {done ? (
        <>
          <p>
            Die neue E-Mail-Adresse ist jetzt gültig. Alle bisherigen Sitzungen
            wurden beendet.
          </p>
          <Link
            className="primary linkButton"
            href={
              (slug
                ? "/anmelden?network=" + encodeURIComponent(slug)
                : "/anmelden") as never
            }
          >
            Mit neuer Adresse anmelden
          </Link>
        </>
      ) : token ? (
        <form className="formGrid" onSubmit={submit}>
          <p>
            Zum Schutz Ihres Kontos benötigen wir zusätzlich Ihr aktuelles
            Passwort. Der Link ist nur einmal und für 30 Minuten gültig.
          </p>
          <label className="full">
            Aktuelles Passwort
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={200}
              required
            />
          </label>
          <button className="primary full" disabled={busy}>
            {busy
              ? "Wird bestätigt …"
              : "Neue Login-Adresse verbindlich bestätigen"}
          </button>
        </form>
      ) : (
        <p>
          Der Bestätigungslink ist unvollständig. Fordern Sie in Ihren
          Kontoeinstellungen einen neuen Link an.
        </p>
      )}
      {notice && <p role="alert">{notice}</p>}
    </section>
  );
  return brand ? (
    <NetworkAuthFrame brand={brand} kind="login">
      {body}
    </NetworkAuthFrame>
  ) : (
    <main className="v2">
      <SiteHeader />
      <section className="authPage">{body}</section>
      <SiteFooter />
    </main>
  );
}
export default function ConfirmPage() {
  return (
    <Suspense fallback={<p>Bestätigung wird geladen …</p>}>
      <Confirm />
    </Suspense>
  );
}
