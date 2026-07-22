"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";

type Dashboard = {
  network: { id: string; name: string; status: string; trialEndsAt: string | null };
  members: { total: number; active: number; pending: number };
  content: { total: number; events: number; topics: number; tasks: number; documents: number };
  recent: Array<{ id: string; type: string; title: string; updatedAt: string }>;
};

export function NetworkDashboardWorkspace({ slug }: { slug: string }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");
  const base = `/portal/netzwerk/${slug}`;

  useEffect(() => {
    const token = getPortalSession();
    if (!token) {
      setMessage("Bitte melden Sie sich erneut an.");
      return;
    }
    portalRequest<{ id: string }>(`/networks/public/${slug}`)
      .then((network) => portalRequest<Dashboard>(`/networks/${network.id}/dashboard`, { token }))
      .then(setData)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Die Netzwerkübersicht konnte nicht geladen werden."));
  }, [slug]);

  if (!data) return <section className="networkCard networkLoading"><p>{message || "Netzwerkübersicht wird geladen …"}</p></section>;

  const trial = data.network.status === "trial";
  const days = data.network.trialEndsAt ? Math.max(0, Math.ceil((Date.parse(data.network.trialEndsAt) - Date.now()) / 86_400_000)) : 0;

  return <>
    {trial && <section className="networkTrialBanner">
      <div className="networkTrialCopy">
        <span>UNVERBINDLICHE TESTANSICHT</span>
        <h2>Noch {days} Tage Ihr Netzwerkportal erkunden</h2>
        <p>Sie möchten Mitglieder einladen und alle Funktionen produktiv nutzen? Aktivieren Sie jetzt Ihr geschlossenes Netzwerkportal.</p>
        <small>Keine automatische Verlängerung · Persönlich begleitete Einrichtung</small>
      </div>
      <div className="networkTrialBooking">
        <p><strong>390 €</strong><span>netto pro Monat<br />bis 50 Mitgliedsunternehmen</span></p>
        <small>zzgl. 2.990 € netto einmalige Einrichtung</small>
        <Link href={`${base}/buchen` as never}>Buchung sicher fortsetzen <b aria-hidden="true">→</b></Link>
      </div>
    </section>}
    <section className="networkHero"><div><span>NETZWERKSTATUS</span><h2>{data.network.name}</h2><p>Geschlossener, mandantengetrennter Netzwerkbereich.</p></div><strong>{data.members.active}<small>aktive Unternehmen</small></strong></section>
    <section className="networkStats">{[[data.members.active,"Mitglieder"],[data.content.events,"Veranstaltungen"],[data.content.tasks,"Aufgaben"],[data.content.total,"Inhalte"]].map(([value,label])=><article key={String(label)}><strong>{value}</strong><span>{label}<small>Aktueller Stand</small></span></article>)}</section>
    <div className="networkDashboardGrid"><section className="networkCard"><header><div><span>AKTIVITÄTEN</span><h2>Was im Netzwerk passiert</h2></div><Link href={`${base}/auswertungen` as never}>Auswertung →</Link></header><div className="networkActivity">{data.recent.map((item)=><p key={item.id}><b>{item.type.slice(0,2).toUpperCase()}</b><span><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleString("de-DE")}</small></span></p>)}{!data.recent.length&&<div className="networkEmpty"><b>Noch keine Aktivitäten</b><p>Im Demomodus bleiben die Daten unverändert.</p></div>}</div></section><aside><section className="networkCard"><header><div><span>SCHNELLZUGRIFF</span><h2>Netzwerkbereiche</h2></div></header><nav className="networkQuickLinks">{[["mitglieder","Mitglieder verwalten"],["veranstaltungen","Treffen planen"],["matching","Bedarfe & Matching"],["einstellungen","Netzwerk einrichten"]].map(([path,label])=><Link key={path} href={`${base}/${path}` as never}>{label}<b>→</b></Link>)}</nav></section></aside></div>
  </>;
}
