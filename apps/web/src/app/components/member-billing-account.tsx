"use client";
import { NetworkText } from "./network-text-editor";
import { useEffect, useState, type FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { AccountIcon } from "./account-icon";
type Order = {
  launchPromotion?:{id:string;slot:number;limit?:number;paidFrom:string};
  hasPdf?:boolean;paymentStatus?:string;paidAt?:string;id:string;monthlyNetCents:number;grossCents:number;
  minimumTermMonths:number;serviceStartsAt:string;serviceEndsAt:string;
  invoiceReference?:string|null;invoiceSentAt?:string|null;
  billingPolicy?:{freeUntil:string|null;invoiceDate:string;paymentDueDate:string};
};
type Offer = {networkName?:string;monthlyNetCents:number;grossCents:number;months:number;centrallyFunded:boolean;complimentaryAccess?:boolean;
  billing:{version:string;freeUntil:string|null;paidFrom:string|null;paidThrough:string|null;automaticInvoices:boolean}|null};
const money=(n:number)=>(n/100).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const date=(v?:string|null)=>{
  if(!v)return "–";
  const d=new Date(v.length===10?v+"T12:00:00Z":v);
  return Number.isNaN(d.getTime())?"–":d.toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"});
};
const lastDay=(v:string)=>Number.isFinite(Date.parse(v))?date(new Date(Date.parse(v)-1).toISOString()):"–";
export function MemberBillingAccount({historyNetwork}: {historyNetwork?:{id:string;name:string}}={}) {
  const access=useNetworkAccess(),[orders,setOrders]=useState<Order[]>([]),[offer,setOffer]=useState<Offer|null>(null),
    [networks,setNetworks]=useState<{id:string;name:string}[]>([]),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const networkId=access?.networkId||historyNetwork?.id;
  const name=historyNetwork?.name||access?.networkName||offer?.networkName;
  async function load(){
    const token=getPortalSession();
    if(!token){setNotice("Bitte melde dich erneut an.");setLoading(false);return;}
    setLoading(true);
    try{
      if(networkId) {
        const [items,quote]=await Promise.all([
          portalRequest<Order[]>("/networks/"+networkId+"/my-billing",{token}),
          access?.networkId?portalRequest<Offer>("/networks/"+networkId+"/billing-offer",{token}).catch(()=>null):Promise.resolve(null)
        ]);
        setOrders(items);setOffer(quote);
      } else setNetworks(await portalRequest("/networks/account/billing-history/networks",{token}));
    }catch(e){setNotice(e instanceof Error?e.message:"Deine Mitgliedschaft konnte nicht geladen werden.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[networkId]);
  async function accept(e:FormEvent<HTMLFormElement>,o:Order){
    e.preventDefault();if(!offer?.billing)return;setBusy(true);setNotice("");
    try{
      await portalRequest("/networks/"+networkId+"/my-billing/"+encodeURIComponent(o.id)+"/accept-policy",{token:getPortalSession()||"",body:{
        acceptedBillingVersion:offer.billing.version,acceptedMonthlyNetCents:offer.monthlyNetCents,termsAccepted:true,
        authorityConfirmed:true,paymentObligationAccepted:true,pdfInvoiceAccepted:true
      }});
      await load();setNotice("Die neuen Abrechnungsbedingungen wurden bestätigt.");
    }catch(e){setNotice(e instanceof Error?e.message:"Umstellung fehlgeschlagen.");}finally{setBusy(false);}
  }
  async function download(o:Order){
    setBusy(true);setNotice("");
    try{
      const pdf=await portalRequest<{base64:string;number:string}>("/networks/"+networkId+"/my-billing/"+encodeURIComponent(o.id)+"/pdf",{token:getPortalSession()||""});
      const url=URL.createObjectURL(new Blob([Uint8Array.from(atob(pdf.base64),c=>c.charCodeAt(0))],{type:"application/pdf"}));
      const a=document.createElement("a");a.href=url;a.download=pdf.number+".pdf";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setNotice("Rechnung konnte nicht geladen werden. Bitte versuche es erneut.");}finally{setBusy(false);}
  }
  function orderCard(o:Order){
    const free=!!o.launchPromotion||o.grossCents===0,expired=Number.isFinite(Date.parse(o.serviceEndsAt))&&Date.parse(o.serviceEndsAt)<=Date.now();
    const paid=o.paymentStatus==="paid",overdue=o.paymentStatus==="overdue";
    return <article key={o.id} className="accountOrder">
      <div className="accountOrderTop"><div><h3>{free?"Kostenlose Mitgliedschaft":"Deine Netzwerknutzung"}</h3><p>{o.launchPromotion?"Herzlichen Glückwunsch zu deiner kostenlosen Startmitgliedschaft.":o.minimumTermMonths+" Monate · alle gebuchten Netzwerkfunktionen"}</p></div>
        <span className={"accountBadge "+(expired?"":free||paid?"positive":overdue?"overdue":"attention")}>{expired?"Abgelaufen":free?"Kostenlos":paid?"Gezahlt":overdue?"Überfällig":"Zahlung offen"}</span></div>
      <dl className="accountOrderFacts">
        <div><dt>Deine Laufzeit</dt><dd>{date(o.serviceStartsAt)} – {lastDay(o.serviceEndsAt)}<small>{o.minimumTermMonths} Monate</small></dd></div>
        <div><dt>{free?"Dein Beitrag":"Gesamtbeitrag"}</dt><dd>{money(o.grossCents)}<small>{free?"Kostenlose Mitgliedschaft":"inklusive 19 % MwSt."}</small></dd></div>
        <div><dt>{free?"Nutzung":"Monatspreis"}</dt><dd>{free?o.minimumTermMonths+" Monate frei":money(o.monthlyNetCents)}<small>{free?"Keine Zahlung erforderlich":"netto pro Monat"}</small></dd></div>
      </dl>
      {!free&&o.billingPolicy?.freeUntil&&<p className="accountMuted">Kostenlos bis einschließlich {date(o.billingPolicy.freeUntil)}.</p>}
      <div className="accountInvoiceRow"><div>
        <p>{free?"Keine Rechnung erforderlich":o.invoiceReference?"Rechnung "+o.invoiceReference:"Rechnung noch nicht erstellt"}</p>
        {!free&&<small>{o.invoiceSentAt?"Versendet am "+date(o.invoiceSentAt):o.billingPolicy?.invoiceDate?"Versand geplant: "+date(o.billingPolicy.invoiceDate):"Deine Rechnung wird hier bereitgestellt."}{o.billingPolicy?.paymentDueDate?" · Zahlbar bis "+date(o.billingPolicy.paymentDueDate):""}</small>}
        {!free&&paid&&o.paidAt&&<small>Bezahlt am {date(o.paidAt)}</small>}
      </div>{o.hasPdf&&<button type="button" className="accountButton secondary" disabled={busy} onClick={()=>void download(o)}><AccountIcon name="download"/>Rechnung herunterladen</button>}</div>
    </article>;
  }
  if(!networkId&&networks.length)return <div className="accountBillingList">{networks.map(n=><MemberBillingAccount key={n.id} historyNetwork={n}/>)}</div>;
  return <section className="accountPanel">
    <header className="accountPanelHeader"><span className="accountPanelIcon"><AccountIcon name="receipt"/></span><div><h3><NetworkText id="ui.account.membership.network-name">{name||"Deine Mitgliedschaften"}</NetworkText></h3><p>Laufzeit und Abrechnung deines Zugangs.</p></div></header>
    {notice&&<div className="accountPanelBody"><p className="accountNotice" role="status">{notice}</p><button type="button" className="accountButton secondary" onClick={()=>void load()}>Erneut laden</button></div>}
    {loading?<div className="accountEmpty" role="status"><p>Mitgliedschaft wird geladen …</p></div>:orders.length?<>
      {orderCard(orders[0])}
      {orders.length>1&&<details className="accountHistory"><summary>Frühere Buchungen ({orders.length-1})</summary>{orders.slice(1).map(orderCard)}</details>}
      {offer?.billing&&!offer.centrallyFunded&&!orders[0].billingPolicy&&!orders[0].invoiceReference&&orders[0].paymentStatus!=="paid"&&<details className="accountAgreement"><summary>Neue Abrechnungsvereinbarung ansehen</summary><form className="accountForm" onSubmit={e=>void accept(e,orders[0])}>
        <h3>Freiwillige Umstellung</h3><p>{money(offer.monthlyNetCents)} netto pro Monat × {offer.months} Monate · {money(offer.grossCents)} inklusive MwSt.</p>
        {offer.billing.freeUntil&&<p>Kostenlos bis {date(offer.billing.freeUntil)}. Rechnung 15 Tage vor Ende der kostenlosen Nutzung, zahlbar innerhalb von 14 Tagen. Bei späterer Zustimmung nach Bestätigung.</p>}
        {offer.billing.paidFrom&&offer.billing.paidThrough&&<p>Leistungszeitraum: {date(offer.billing.paidFrom)} – {date(offer.billing.paidThrough)}.</p>}
        <label className="accountConsent"><input type="checkbox" required/><span>Ich bin zur Buchung für mein Unternehmen berechtigt und stimme dem Gesamtpreis, den <a href="/agb" target="_blank" rel="noopener noreferrer">AGB</a> und dem Rechnungsversand als E-Rechnung mit PDF-Darstellung zu. Meine bestehende Buchung wird erst nach dieser Bestätigung umgestellt.</span></label>
        <button className="accountButton" disabled={busy||!!access?.readOnly}>Vereinbarung verbindlich bestätigen</button>
      </form></details>}
    </>:!notice&&<div className="accountEmpty"><span className="accountPanelIcon"><AccountIcon name="receipt"/></span><h3>{offer?.complimentaryAccess?"Dein Zugang ist beitragsfrei":offer?.centrallyFunded?"Dein Netzwerk übernimmt die Kosten":"Keine persönlichen Buchungen"}</h3><p>{offer?.complimentaryAccess||offer?.centrallyFunded?"Für diesen Zugang gibt es keine persönliche Rechnung.":"Sobald eine Mitgliedschaft gebucht ist, findest du hier deine Laufzeit und die zugehörigen Rechnungen."}</p></div>}
  </section>;
}
