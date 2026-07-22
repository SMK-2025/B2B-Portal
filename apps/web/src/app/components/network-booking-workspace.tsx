"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";

type Network = { id:string; name:string; status:string };
type Order = { id:string; status:string; submittedAt:string; billingCycle:"annual"|"semiannual" };

export function NetworkBookingWorkspace({slug}:{slug:string}) {
  const [network,setNetwork]=useState<Network|null>(null);
  const [existing,setExisting]=useState<Order|null>(null);
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{
    const token=getPortalSession();if(!token)return;
    portalRequest<Network>(`/networks/public/${slug}`).then(async found=>{
      setNetwork(found);const orders=await portalRequest<Order[]>(`/networks/${found.id}/orders`,{token});setExisting(orders.find(item=>item.status==="submitted")||null);
    }).catch(reason=>setError(reason instanceof Error?reason.message:"Die Buchungsdaten konnten nicht geladen werden."));
  },[slug]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!network||submitting)return;setSubmitting(true);setError("");
    const token=getPortalSession(),form=new FormData(event.currentTarget);
    try{const order=await portalRequest<Order>(`/networks/${network.id}/orders`,{token:token||undefined,body:{invoiceCompany:form.get("invoiceCompany"),invoiceContact:form.get("invoiceContact"),invoiceEmail:form.get("invoiceEmail"),invoiceStreet:form.get("invoiceStreet"),invoicePostalCode:form.get("invoicePostalCode"),invoiceCity:form.get("invoiceCity"),invoiceCountry:form.get("invoiceCountry"),purchaseOrderReference:form.get("purchaseOrderReference"),billingCycle:form.get("billingCycle"),authorityConfirmed:form.get("authorityConfirmed")==="on",termsAccepted:form.get("termsAccepted")==="on",paymentObligationAccepted:form.get("paymentObligationAccepted")==="on"}});setExisting(order)}catch(reason){setError(reason instanceof Error?reason.message:"Die Bestellung konnte nicht gespeichert werden.")}finally{setSubmitting(false)}
  }

  if(existing)return <section className="networkOrderSuccess"><span>BESTELLUNG EINGEGANGEN</span><h2>Vielen Dank. Ihre verbindliche Buchung wurde dokumentiert.</h2><p>Bestellnummer <strong>{existing.id}</strong><br/>Eingang am {new Date(existing.submittedAt).toLocaleString("de-DE")}</p><div><b>Wie geht es weiter?</b><p>Sie erhalten die Auftragsbestätigung und Rechnung in Textform. Die produktiven Funktionen werden nach Prüfung und Freigabe aktiviert.</p></div><Link href={`/portal/netzwerk/${slug}` as never}>Zurück zur Netzwerkübersicht →</Link></section>;

  return <form className="networkBooking" onSubmit={submit}>
    <section className="networkBookingSummary"><div><span>VERBINDLICHE BUCHUNG</span><h2>Netzwerkportal für bis zu 50 Mitgliedsunternehmen</h2><p>12 Monate Mindestlaufzeit · Hosting, Wartung, Sicherheits- und Funktionsupdates inklusive</p></div><div><p><strong>390 €</strong> netto / Monat</p><p><strong>2.990 €</strong> netto einmalige Einrichtung</p><small>Zuzüglich gesetzlicher Umsatzsteuer</small></div></section>
    <section className="networkBookingSection"><header><span>1</span><div><h3>Rechnungsempfänger</h3><p>Bitte geben Sie die vollständigen geschäftlichen Rechnungsdaten an.</p></div></header><div className="networkBookingFields"><label className="wide">Firma / Organisation<input name="invoiceCompany" required maxLength={200}/></label><label>Ansprechpartner<input name="invoiceContact" required maxLength={160}/></label><label>Rechnungs-E-Mail<input name="invoiceEmail" type="email" required maxLength={250}/></label><label className="wide">Straße und Hausnummer<input name="invoiceStreet" required maxLength={200}/></label><label>Postleitzahl<input name="invoicePostalCode" required maxLength={12}/></label><label>Ort<input name="invoiceCity" required maxLength={120}/></label><label>Land<input name="invoiceCountry" defaultValue="Deutschland" required maxLength={80}/></label><label>Bestellreferenz (optional)<input name="purchaseOrderReference" maxLength={120}/></label></div></section>
    <section className="networkBookingSection"><header><span>2</span><div><h3>Abrechnung wählen</h3><p>Die Vergütung ist entsprechend der gewählten Abrechnung im Voraus fällig.</p></div></header><div className="networkBillingOptions"><label><input type="radio" name="billingCycle" value="annual" defaultChecked required/><span><b>Jährliche Vorauszahlung</b><small>4.680 € netto für 12 Monate<br/>Erste Rechnung inklusive Einrichtung: 7.670 € netto</small></span></label><label><input type="radio" name="billingCycle" value="semiannual" required/><span><b>Halbjährliche Abrechnung</b><small>2.340 € netto je Halbjahr<br/>Erste Rechnung inklusive Einrichtung: 5.330 € netto</small></span></label></div></section>
    <section className="networkBookingSection"><header><span>3</span><div><h3>Vertrag verbindlich abschließen</h3><p>Prüfen und bestätigen Sie die folgenden Erklärungen.</p></div></header><div className="networkBookingConsents"><label><input type="checkbox" name="authorityConfirmed" required/><span>Ich bestätige, für den genannten Rechnungsempfänger vertretungs- oder entscheidungsberechtigt zu sein und diese Bestellung verbindlich abgeben zu dürfen.</span></label><label><input type="checkbox" name="termsAccepted" required/><span>Ich akzeptiere die <Link href="/agb" target="_blank">AGB</Link> und habe die Leistungsbeschreibung, Preise, Mindestlaufzeit und Vorauszahlung zur Kenntnis genommen.</span></label><label><input type="checkbox" name="paymentObligationAccepted" required/><span>Ich bestätige ausdrücklich, dass die Bestellung kostenpflichtig ist und die einmalige Einrichtung zusätzlich zur laufenden Netzwerkpauschale berechnet wird.</span></label></div></section>
    {error&&<p className="networkBookingError" role="alert">{error}</p>}
    <footer className="networkBookingFooter"><p><b>Heute fälliger Betrag: noch keine unmittelbare Abbuchung.</b><small>Die Rechnung folgt nach Prüfung und Auftragsbestätigung. Mit Ihrer Bestellung geben Sie ein verbindliches Angebot zum Vertragsschluss ab.</small></p><button type="submit" disabled={submitting}>{submitting?"Bestellung wird übermittelt …":"Zahlungspflichtig bestellen"}</button></footer>
  </form>;
}
