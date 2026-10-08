import type {NetworkModule} from "../core/domain";

export type NetworkProductModule={
 id:NetworkModule;
 name:string;
 shortDescription:string;
 unitNetCents:number;
 required?:boolean;
 enabledModules:NetworkModule[];
};

export const NETWORK_MODULE_CATALOG:NetworkProductModule[]=[
 {id:"profiles",name:"Unternehmensseiten",shortDescription:"Jedem Nutzer eine auffindbare Standard-Unternehmensseite im geschlossenen Netzwerk bereitstellen. Das Partnerverzeichnis ist kostenlos enthalten.",unitNetCents:1900,required:true,enabledModules:["profiles"]},
 {id:"events",name:"Netzwerkveranstaltungen",shortDescription:"Termine, Anmeldungen, Gäste, Anwesenheiten und Teilnehmerlisten zentral verwalten.",unitNetCents:700,enabledModules:["events"]},
 {id:"communication",name:"Direktnachrichten & Partnerchat",shortDescription:"Geschützte Einzelgespräche zwischen freigegebenen Netzwerkpartnern führen.",unitNetCents:500,enabledModules:["communication"]},
 {id:"community",name:"Netzwerkchat & Community",shortDescription:"Ankündigungen, Gruppen, Diskussionen und Austausch mit allen Teilnehmern ermöglichen.",unitNetCents:400,enabledModules:["community"]},
 {id:"services",name:"Angebote & Leistungen",shortDescription:"Leistungen, Kooperationsangebote und konkrete Mehrwerte innerhalb des Netzwerks veröffentlichen.",unitNetCents:500,enabledModules:["services"]},
 {id:"documents",name:"Dokumente & Wissensbereich",shortDescription:"Protokolle, Vorlagen und geschützte Netzwerkunterlagen geordnet bereitstellen.",unitNetCents:300,enabledModules:["documents"]},
 {id:"tasks",name:"Aufgaben & Zusammenarbeit",shortDescription:"Verantwortlichkeiten, offene Punkte und gemeinsame nächste Schritte nachhalten.",unitNetCents:300,enabledModules:["tasks"]},
 {id:"analytics",name:"Aktivität & Auswertungen",shortDescription:"Mitgliederentwicklung, Nutzung, Veranstaltungen und Beteiligung auswerten.",unitNetCents:400,enabledModules:["analytics"]},
 {id:"revenue",name:"Vermittelter Umsatz",shortDescription:"Vermittlungen und daraus entstandene Umsätze vertraulich für die Netzwerkleitung dokumentieren.",unitNetCents:400,enabledModules:["revenue"]},
];

export const NETWORK_COMPLETE_UNIT_NET_CENTS=4900;
export const NETWORK_SETUP_NET_CENTS=299000;
export const NETWORK_INCLUDED_MODULES:NetworkModule[]=["members","branding"];

export function allProductModuleIds(){return NETWORK_MODULE_CATALOG.map(item=>item.id)}
export function expandNetworkModules(selected:NetworkModule[]){
 return [...new Set([...NETWORK_INCLUDED_MODULES,...NETWORK_MODULE_CATALOG.filter(item=>selected.includes(item.id)).flatMap(item=>item.enabledModules)])];
}
