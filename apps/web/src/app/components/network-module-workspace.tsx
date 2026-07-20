"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";

type ContentType="event"|"topic"|"task"|"document"|"conversation"|"need";
type Status="draft"|"published"|"active"|"completed"|"archived";
type Item={id:string;type:ContentType;title:string;description:string;status:Status;startsAt:string|null;visibility:"members"|"administrators";updatedAt:string};
type Config={type:ContentType;singular:string;plural:string;empty:string};

const configs:Record<string,Config>={
 veranstaltungen:{type:"event",singular:"Veranstaltung",plural:"Veranstaltungen",empty:"Noch keine Veranstaltungen angelegt"},
 matching:{type:"need",singular:"Netzwerkbedarf",plural:"Bedarfe und Angebote",empty:"Noch keine internen Bedarfe veröffentlicht"},
 kommunikation:{type:"conversation",singular:"Gespräch",plural:"Gespräche",empty:"Noch keine freigegebenen Gespräche vorhanden"},
 themen:{type:"topic",singular:"Netzwerkthema",plural:"Themen und Ankündigungen",empty:"Noch keine Netzwerkthemen veröffentlicht"},
 aufgaben:{type:"task",singular:"Aufgabe",plural:"Aufgaben",empty:"Noch keine Aufgaben erfasst"},
 dokumente:{type:"document",singular:"Dokument",plural:"Dokumente und Wissen",empty:"Noch keine Dokumente bereitgestellt"}
};
const labels:Record<Status,string>={draft:"Entwurf",published:"Veröffentlicht",active:"Aktiv",completed:"Erledigt",archived:"Archiviert"};

export function NetworkModuleWorkspace({module}:{module:string}){
 const config=configs[module];
 const [networkId,setNetworkId]=useState("");
 const [items,setItems]=useState<Item[]>([]);
 const [dialog,setDialog]=useState(false);
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Alle");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);

 useEffect(()=>{void load()},[module]);
 async function load(){
  const token=getPortalSession();if(!token||!config){setNotice("Bitte melden Sie sich erneut an.");return}
  try{
   const network=await portalRequest<{id:string}>("/networks/public/unternehmerfreunde-nrw");
   setNetworkId(network.id);
   setItems(await portalRequest<Item[]>(`/networks/${network.id}/content?type=${config.type}`,{token}));
  }catch(error){setNotice(error instanceof Error?error.message:"Die Netzwerkdaten konnten nicht geladen werden.")}
 }
 const visible=useMemo(()=>items.filter(item=>(filter==="Alle"||labels[item.status]===filter)&&`${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())),[items,query,filter]);
 if(!config)return null;

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const token=getPortalSession();if(!token||!networkId)return;
  const form=new FormData(event.currentTarget);setBusy(true);
  const data={category:form.get("category"),location:form.get("location"),mode:form.get("mode"),recurrence:form.get("recurrence"),capacity:form.get("capacity"),deadline:form.get("deadline"),priority:form.get("priority"),assignee:form.get("assignee"),url:form.get("url"),keywords:form.get("keywords"),options:form.get("options")};
  try{
   const created=await portalRequest<Item>(`/networks/${networkId}/content`,{token,body:{type:config.type,title:form.get("title"),description:form.get("description"),status:form.get("status"),startsAt:form.get("startsAt"),endsAt:form.get("endsAt"),visibility:form.get("visibility"),data}});
   setItems(current=>[created,...current]);setDialog(false);setNotice(`${config.singular} wurde gespeichert.`);
  }catch(error){setNotice(error instanceof Error?error.message:"Der Eintrag konnte nicht gespeichert werden.")}finally{setBusy(false)}
 }
 async function change(item:Item,status:Status){
  const token=getPortalSession();if(!token||!networkId)return;
  try{const updated=await portalRequest<Item>(`/networks/${networkId}/content/${item.id}`,{token,body:{status}});setItems(current=>current.map(entry=>entry.id===updated.id?updated:entry));setNotice(`Status: ${labels[status]}.`)}catch(error){setNotice(error instanceof Error?error.message:"Der Status konnte nicht geändert werden.")}
 }
 function exportCsv(){
  const rows=[["Titel","Beschreibung","Status","Start","Aktualisiert"],...visible.map(item=>[item.title,item.description,labels[item.status],item.startsAt||"",item.updatedAt])];
  const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(";")).join("\n");
  const link=document.createElement("a");link.href=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));link.download=`${module}-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
 }

 return <div className="networkFunctionalWorkspace">
  <div className="networkMemberToolbar">
   <label><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={`${config.plural} durchsuchen`}/></label>
   <select value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Status filtern"><option>Alle</option>{Object.values(labels).map(label=><option key={label}>{label}</option>)}</select>
   <button className="networkPrimary" type="button" onClick={()=>setDialog(true)}>＋ {config.singular} anlegen</button>
  </div>
  <div className="networkMemberStats"><button className={filter==="Alle"?"active":""} onClick={()=>setFilter("Alle")}><strong>{items.length}</strong><span>Gesamt</span></button>{(["published","active","completed"] as const).map(value=><button key={value} className={filter===labels[value]?"active":""} onClick={()=>setFilter(labels[value])}><strong>{items.filter(item=>item.status===value).length}</strong><span>{labels[value]}</span></button>)}</div>
  <section className="networkCard">
   <header><div><span>NETZWERKMODUL</span><h2>{config.plural}</h2></div><button type="button" onClick={exportCsv} disabled={!visible.length}>CSV exportieren</button></header>
   <div className="networkContentRows">{visible.map(item=><article key={item.id}><div><span className={`networkMemberStatus ${item.status}`}>{labels[item.status]}</span><h3>{item.title}</h3><p>{item.description}</p><small>{item.startsAt?new Date(item.startsAt).toLocaleString("de-DE"):"Ohne Termin"} · {item.visibility==="administrators"?"Nur Verwaltung":"Alle Mitglieder"}</small></div><div className="networkRowActions">{item.status!=="published"&&item.status!=="completed"&&<button onClick={()=>void change(item,"published")} title="Veröffentlichen" aria-label="Veröffentlichen">✓</button>}{item.status!=="completed"&&<button onClick={()=>void change(item,"completed")} title="Erledigen" aria-label="Erledigen">○</button>}{item.status!=="archived"&&<button onClick={()=>void change(item,"archived")} title="Archivieren" aria-label="Archivieren">⌑</button>}</div></article>)}</div>
   {!visible.length&&<div className="networkEmpty"><b>{config.empty}</b><p>Legen Sie den ersten Eintrag an oder ändern Sie den Filter.</p><button className="networkPrimary" onClick={()=>setDialog(true)}>＋ Jetzt {config.singular.toLowerCase()} anlegen</button></div>}
  </section>
  {dialog&&<div className="networkModalBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setDialog(false)}}><section className="networkModal networkContentModal" role="dialog" aria-modal="true">
   <header><div><span>{config.plural.toUpperCase()}</span><h2>{config.singular} anlegen</h2></div><button type="button" onClick={()=>setDialog(false)} aria-label="Dialog schließen">×</button></header>
   <form onSubmit={submit}>
    <label>Titel<input name="title" required minLength={2}/></label><label>Ausführliche Beschreibung<textarea name="description" required rows={5}/></label>
    <div><label>Kategorie<input name="category" placeholder="Kategorie oder Fachbereich"/></label><label>Sichtbarkeit<select name="visibility"><option value="members">Alle Mitglieder</option><option value="administrators">Nur Verwaltung</option></select></label></div>
    {module==="veranstaltungen"&&<><div><label>Beginn<input name="startsAt" type="datetime-local" required/></label><label>Ende<input name="endsAt" type="datetime-local"/></label></div><div><label>Format<select name="mode"><option>Vor Ort</option><option>Online</option><option>Hybrid</option></select></label><label>Ort oder Einwahllink<input name="location"/></label></div><div><label>Wiederholung<select name="recurrence"><option>Einmalig</option><option>Wöchentlich</option><option>Monatlich</option><option>Individuell</option></select></label><label>Höchstteilnehmerzahl<input name="capacity" type="number" min="1"/></label></div><label>Anmeldeschluss<input name="deadline" type="datetime-local"/></label></>}
    {module==="aufgaben"&&<div><label>Priorität<select name="priority"><option>Normal</option><option>Hoch</option><option>Dringend</option></select></label><label>Verantwortlich<input name="assignee" placeholder="Person oder Team"/></label></div>}
    {module==="dokumente"&&<label>Geschützter Dokumentlink<input name="url" type="url" placeholder="https://"/></label>}
    {module==="themen"&&<><label>Keywords<input name="keywords" placeholder="Kommagetrennte Schlagworte"/></label><label>Antwortoptionen bei einer Umfrage<textarea name="options" rows={3} placeholder="Eine Option pro Zeile"/></label></>}
    <div><label>Status<select name="status"><option value="published">Veröffentlicht</option><option value="draft">Entwurf</option><option value="active">Aktiv</option></select></label></div>
    <div className="adminNetworkDialogActions"><button type="button" onClick={()=>setDialog(false)}>Abbrechen</button><button className="networkPrimary" disabled={busy}>{busy?"Wird gespeichert …":"Speichern"}</button></div>
   </form>
  </section></div>}
  {notice&&<div className="networkNotice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Meldung schließen">×</button></div>}
 </div>;
}
