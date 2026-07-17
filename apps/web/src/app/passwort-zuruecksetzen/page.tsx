"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { portalRequest } from "../lib/portal-api";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [changed,setChanged]=useState(false);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password")); const confirmation = String(form.get("confirmation"));
    if (password !== confirmation) { setMessage("Die beiden Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    try {
      await portalRequest("/auth/password-reset/confirm", { body: { token, password } });
      setChanged(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Das Passwort konnte nicht geändert werden.");
    } finally { setLoading(false); }
  }

  if (!token) return <><h2>Link unvollständig</h2><p className="error">Der Zurücksetzungscode fehlt. Fordern Sie bitte einen neuen Link an.</p><Link className="primary linkButton" href="/passwort-vergessen">Neuen Link anfordern</Link></>;
  if (changed) return <div className="success"><div className="check">✓</div><h2>Passwort geändert</h2><p className="lead">Sie können sich jetzt mit Ihrem neuen Passwort anmelden.</p><Link className="primary linkButton" href="/anmelden">Jetzt anmelden</Link></div>;
  return <><h2>Neues Passwort vergeben</h2><p className="lead">Verwenden Sie mindestens 12 Zeichen und ein nur hier eingesetztes Passwort.</p><form className="formGrid" onSubmit={reset}><label className="full">Neues Passwort<input type="password" name="password" minLength={12} required autoComplete="new-password"/><small>Mindestens 12 Zeichen</small></label><label className="full">Passwort wiederholen<input type="password" name="confirmation" minLength={12} required autoComplete="new-password"/></label><button className="primary full" disabled={loading}>{loading?"Passwort wird geändert …":"Neues Passwort speichern"}</button></form>{message&&<p className="error" role="alert">{message}</p>}</>;
}

export default function PasswortZuruecksetzen() {
  return <main className="v2"><SiteHeader/><section className="authPage loginPage"><aside className="authStory"><span>NEUES PASSWORT</span><h1>Sicher weiterarbeiten.</h1><p>Nach erfolgreicher Änderung werden alle alten Sitzungen beendet und Sie melden sich neu an.</p></aside><section className="authCard authCardV2"><p className="sectionKicker">KONTO SICHERN</p><Suspense fallback={<p className="lead">Link wird geprüft …</p>}><ResetForm/></Suspense></section></section><SiteFooter/></main>;
}
