"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import type {ReactNode} from "react";
import {useState} from "react";

const groups=[["Netzwerk",["Übersicht","mitglieder","veranstaltungen"]],["Zusammenarbeit",["matching","kommunikation","themen"]],["Organisation",["aufgaben","dokumente","auswertungen"]],["Verwaltung",["einstellungen"]]] as const;
const labels:Record<string,string>={mitglieder:"Mitglieder",veranstaltungen:"Veranstaltungen",matching:"Bedarfe & Matching",kommunikation:"Nachrichten",themen:"Themen & Gruppen",aufgaben:"Aufgaben",dokumente:"Dokumente",auswertungen:"Statistiken",einstellungen:"Einstellungen"};
const icons:Record<string,string>={mitglieder:"♙",veranstaltungen:"□",matching:"◎",kommunikation:"✉",themen:"◇",aufgaben:"✓",dokumente:"▤",auswertungen:"↗",einstellungen:"⚙"};

export function NetworkShell({title,intro,children,action,slug="unternehmerfreunde-nrw",networkName="Unternehmerfreunde NRW"}:{title:string;intro:string;children:ReactNode;action?:ReactNode;slug?:string;networkName?:string}){
 const pathname=usePathname(),router=useRouter(),[account,setAccount]=useState(false),base=`/portal/netzwerk/${slug}`,initials=networkName.slice(0,2).toUpperCase();
 const hrefFor=(item:string)=>item==="Übersicht"?base:`${base}/${item}`;
 return <main className="networkPortal">
  <aside className="networkSidebar">
   <Link href={base as never} className="networkBrand"><span>{initials}</span><div><strong>{networkName}</strong><small>Netzwerkportal</small></div></Link>
   <label className="networkSwitcher"><small>ARBEITSBEREICH</small><select aria-label="Arbeitsbereich wechseln" defaultValue="network" onChange={event=>{if(event.target.value==="b2b")router.push("/portal/unternehmen")}}><option value="network">{networkName}</option><option value="b2b">Mein Unternehmen</option></select></label>
   <nav aria-label="Netzwerknavigation">{groups.map(([group,items])=><section key={group}><small>{group}</small>{items.map(item=>{const href=hrefFor(item),label=item==="Übersicht"?"Übersicht":labels[item];return <Link key={item} className={pathname===href?"active":""} href={href as never}><span>{item==="Übersicht"?"⌂":icons[item]}</span>{label}</Link>})}</section>)}</nav>
   <div className="networkSupport"><b>Netzwerk-Support</b><p>Fragen zur Verwaltung oder Mitgliedschaft?</p><a href="mailto:service@b2b-matching.de">Support kontaktieren</a></div>
  </aside>
  <section className="networkMain">
   <header className="networkTop"><details className="networkMobileNav"><summary aria-label="Netzwerkmenü öffnen">☰</summary><nav>{groups.flatMap(([,items])=>items).map(item=><Link key={item} href={hrefFor(item) as never}>{item==="Übersicht"?"Übersicht":labels[item]}</Link>)}</nav></details><div className="networkContext"><span>{initials}</span><p><b>{networkName}</b><small>Geschlossener Netzwerkbereich</small></p></div><div className="networkTopActions"><Link href={`${base}/kommunikation` as never} aria-label="Nachrichten">✉<b>0</b></Link><button type="button" onClick={()=>setAccount(!account)} aria-expanded={account}><span>NV</span><p><b>Netzwerkverwaltung</b><small>Netzwerkadministrator</small></p></button>{account&&<div className="networkAccountMenu"><Link href={`${base}/einstellungen` as never}>Netzwerkeinstellungen</Link><Link href="/portal/unternehmen/profil">Unternehmensprofil</Link><Link href="/anmelden">Abmelden</Link></div>}</div></header>
   <div className="networkContent"><header className="networkWelcome"><div><span>{networkName.toUpperCase()}</span><h1>{title}</h1><p>{intro}</p></div>{action}</header>{children}</div>
  </section>
 </main>;
}
