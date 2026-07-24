import {notFound} from "next/navigation";
import {NetworkShell} from "../../../../components/network-shell";
import {NetworkModuleWorkspace} from "../../../../components/network-module-workspace";
import {NetworkMembersWorkspace} from "../../../../components/network-members-workspace";
import {NetworkAdministrationWorkspace} from "../../../../components/network-administration-workspace";
import {NetworkRevenueWorkspace} from "../../../../components/network-revenue-workspace";
const pages:Record<string,[string,string]>={
 mitglieder:["Mitgliederverwaltung","Unternehmen persönlich einladen, prüfen und rollenbasiert verwalten."],
 veranstaltungen:["Veranstaltungen und Treffen","Termine, Anmeldungen, Gäste und tatsächliche Anwesenheit dokumentieren."],
 matching:["Bedarfe und Matching","Bedarfe und Angebote ausschließlich innerhalb des Netzwerks zusammenführen."],
 kommunikation:["Kommunikation","Freigegebene Kontakte und interne Gespräche geschützt führen."],
 themen:["Themen und Gruppen","Ankündigungen, Fachthemen, Umfragen und Austausch bündeln."],
 aufgaben:["Aufgaben","Zuständigkeiten, Wiedervorlagen und Folgetermine verwalten."],
 dokumente:["Dokumente und Wissen","Protokolle, Vorlagen und geschützte Netzwerkunterlagen bereitstellen."],
 auswertungen:["Statistiken","Mitglieder, Aktivitäten, Veranstaltungen und Inhalte auswerten."],
 umsaetze:["Vermittelter Umsatz","Vertrauliche Vermittlungsumsätze erfassen und ausschließlich intern auswerten."],
 einstellungen:["Netzwerkeinstellungen","Branding, Regeln und freigeschaltete Module verwalten."]
};
export default async function Page({params}:{params:Promise<{slug:string;bereich:string}>}){
 const{slug,bereich}=await params,page=pages[bereich];if(!page)notFound();
 const name=slug.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");
 let body;
 if(bereich==="mitglieder")body=<NetworkMembersWorkspace/>;
 else if(bereich==="auswertungen")body=<NetworkAdministrationWorkspace mode="analytics" slug={slug}/>;
 else if(bereich==="einstellungen")body=<NetworkAdministrationWorkspace mode="settings" slug={slug}/>;
 else if(bereich==="umsaetze")body=<NetworkRevenueWorkspace/>;
 else body=<NetworkModuleWorkspace module={bereich} slug={slug}/>;
 return <NetworkShell slug={slug} networkName={name} title={page[0]} intro={page[1]}>{body}</NetworkShell>
}
