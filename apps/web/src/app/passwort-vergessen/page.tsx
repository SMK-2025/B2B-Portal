"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { portalRequest } from "../lib/portal-api";

type ResetRequest = { accepted: boolean; resetToken?: string };

export default function PasswortVergessen() {
  const [sent,setSent]=useState(false);
  const [resetToken,setResetToken]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await portalRequest<ResetRequest>("/auth/password-reset/request", { body: { email: form.get("email") } });
      setResetToken(result.resetToken ?? ""); setSent(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Die Anfrage ist fehlgeschlagen.");
    } finally { setLoading(false); }
  }

  return <main className="v2"><SiteHeader/><section className="authPage loginPage"><aside className="authStory"><span>KONTOZUGANG</span><h1>Wir bringen Sie sicher zurück.</h1><p>Fordern Sie einen zeitlich begrenzten Link an und vergeben Sie anschließend ein neues Passwort.</p><div className="loginPreview"><div><b>Einmaliger Link</b><span>Der Zurücksetzungslink ist 60 Minuten gültig.</span></div><div><b>Bestehende Sitzungen enden</b><span>Nach der Änderung werden bisherige Anmeldungen ungültig.</span></div></div></aside><section className="authCard authCardV2"><p className="sectionKicker">PASSWORT ZURÜCKSETZEN</p>{!sent?<><h2>Link anfordern</h2><p className="lead">Geben Sie die geschäftliche E-Mail-Adresse Ihres Kontos ein.</p><form className="formGrid" onSubmit={requestReset}><label className="full">Geschäftliche E-Mail-Adresse<input type="email" name="email" required autoComplete="email" placeholder="name@unternehmen.de"/></label><button className="primary full" disabled={loading}>{loading?"Anfrage wird gesendet …":"Zurücksetzungslink anfordern"}</button></form>{message&&<p className="error" role="alert">{message}</p>}<p className="authHint"><Link href="/anmelden">Zurück zur Anmeldung</Link></p></>:<div className="success"><div className="check">✓</div><h2>E-Mail ist unterwegs</h2><p className="lead">Falls ein Konto zu dieser Adresse existiert, wurde ein Link zum Zurücksetzen versendet.</p>{resetToken&&<div className="testReset"><small>Testbetrieb: Der E-Mail-Versand wird später angebunden.</small><Link className="primary linkButton" href={{pathname:"/passwort-zuruecksetzen",query:{token:resetToken}}}>Testlink jetzt öffnen</Link></div>}<Link className="secondary linkButton" href="/anmelden">Zur Anmeldung</Link></div>}</section></section><SiteFooter/></main>;
}
