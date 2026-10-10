import {notFound} from "next/navigation";
import {NetworkShell} from "../../../../components/network-shell";
import {NetworkModuleWorkspace} from "../../../../components/network-module-workspace";
import {NetworkMembersWorkspace} from "../../../../components/network-members-workspace";
import {NetworkAdministrationWorkspace} from "../../../../components/network-administration-workspace";
import {NetworkRevenueWorkspace} from "../../../../components/network-revenue-workspace";
import {NetworkProfileWorkspace} from "../../../../components/network-profile-workspace";
import {NetworkEventRecapWorkspace} from "../../../../components/network-event-recap-workspace";
import {NetworkGameScheduleWorkspace} from "../../../../components/network-game-schedule-workspace";
const pages:Record<string,[string,string]>={
 mitglieder:["Partnerverzeichnis","Unternehmen im geschlossenen Partnerkreis finden, kennenlernen und gezielt miteinander in Kontakt bringen."],
 profil:["Meine Partnerseite","Unternehmen, Leistungen und persönliche Ansprechpartner für das geschlossene Netzwerk präsentieren."],
 veranstaltungen:["Veranstaltungen und Treffen","Termine, Anmeldungen, Gäste und tatsächliche Anwesenheit dokumentieren."],
 spielplan:["ProB-Spielplan 2026/27","Spiele, Ergebnisse und den gemeinsamen Austausch mit allen eingetragenen Partnern verbinden."],
 rueckblicke:["Veranstaltungsrückblicke","Bilder, Inhalte und Ergebnisse vergangener Netzwerktreffen chronologisch festhalten."],
 angebote:["Angebote und Leistungen","Leistungen und Kooperationsangebote ausschließlich im geschlossenen Partnernetzwerk sichtbar machen."],
 kommunikation:["Direktnachrichten und Partnergespräche","Geschäftliche Anfragen, Kooperationen und persönlichen Austausch geschützt anstoßen."],
 themen:["Community und Austausch","Neuigkeiten teilen, Meinungen einholen, Erfolge sichtbar machen und gemeinsam Ideen entwickeln."],
 aufgaben:["Aufgaben und Zusammenarbeit","Aus Gesprächen konkrete nächste Schritte, klare Zuständigkeiten und verlässliche Zusammenarbeit machen."],
 dokumente:["Dokumente und Wissen","PDFs, Bilder, Protokolle, Vorlagen und Partnerinformationen zentral und geschützt bereitstellen."],
 auswertungen:["Statistiken","Mitglieder, Aktivitäten, Veranstaltungen und Inhalte auswerten."],
 umsaetze:["Vermittelter Umsatz","Vertrauliche Vermittlungsumsätze erfassen und ausschließlich intern auswerten."],
 einstellungen:["Partnerportal einrichten","Branding, Regeln und freigeschaltete Module zentral verwalten."]
};
export default async function Page({params}:{params:Promise<{slug:string;bereich:string}>}){
 const{slug,bereich}=await params,page=pages[bereich];if(!page)notFound();
 const name=slug.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");
 let body;
 if(bereich==="mitglieder")body=<NetworkMembersWorkspace/>;
 else if(bereich==="profil")body=<NetworkProfileWorkspace/>;
 else if(bereich==="auswertungen")body=<NetworkAdministrationWorkspace mode="analytics" slug={slug}/>;
 else if(bereich==="einstellungen")body=<NetworkAdministrationWorkspace mode="settings" slug={slug}/>;
 else if(bereich==="umsaetze")body=<NetworkRevenueWorkspace/>;
 else if(bereich==="rueckblicke")body=<NetworkEventRecapWorkspace/>;
 else if(bereich==="spielplan")body=<NetworkGameScheduleWorkspace/>;
 else body=<NetworkModuleWorkspace module={bereich} slug={slug}/>;
 return <NetworkShell slug={slug} networkName={name} title={page[0]} intro={page[1]}>{body}</NetworkShell>
}
