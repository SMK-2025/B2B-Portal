export const PROFILE_KEY="b2b-matching-company-profile";
export const NEEDS_KEY="b2b-matching-needs";
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

export function readProfile():StoredProfile|null{
 if(typeof window==="undefined")return null;
 try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"null") as StoredProfile|null}catch{return null}
}

export function readNeeds():StoredNeed[]{
 if(typeof window==="undefined")return [];
 try{return JSON.parse(localStorage.getItem(NEEDS_KEY)||"[]") as StoredNeed[]}catch{return []}
}

export function writeNeeds(needs:StoredNeed[]){
 localStorage.setItem(NEEDS_KEY,JSON.stringify(needs));
 window.dispatchEvent(new Event(PORTAL_UPDATE_EVENT));
}

export function profileProgress(profile:StoredProfile|null){
 if(!profile)return 0;
 if(typeof profile.requiredTotal==="number"&&profile.requiredTotal>0&&typeof profile.requiredCompleted==="number")return Math.min(100,Math.round(profile.requiredCompleted/profile.requiredTotal*100));
 const values=Object.values(profile.values);
 if(!values.length)return 0;
 const completed=values.filter(value=>value===true||(typeof value==="string"&&value.trim().length>0)).length;
 return Math.min(100,Math.round(completed/24*100));
}
