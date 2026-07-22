export const PORTAL_UPDATE_EVENT="b2b-portal-updated";

export type StoredProfile={values:Record<string,string|boolean>;updatedAt:string;requiredTotal?:number;requiredCompleted?:number;requiredSections?:boolean[]};
export type StoredNeed={
 id:string;
 remoteId?:string;
 title:string;
 category:string;
 summary:string;
 details?:Array<{label:string;value:string}>;
 status:"Entwurf"|"In Prüfung"|"Aktiv"|"Pausiert"|"Archiv";
 updatedAt:string;
 values:Record<string,string|boolean>;
};
