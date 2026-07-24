"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";
import {useNetworkAccess} from "./network-shell";

type ContentType="event"|"topic"|"task"|"document"|"conversation"|"need";
type Status="draft"|"published"|"active"|"completed"|"archived";
type Item={id:string;type:ContentType;title:string;description:string;status:Status;startsAt:string|null;visibility:"members"|"administrators";updatedAt:string};
type Attendance={id:string;membershipId:string;memberName:string;organizationName:string;response:"registered"|"declined";attendance:"pending"|"present"|"absent";guestNames:string[];companionCount:number;note:string|null};
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

export function NetworkModuleWorkspace({module,slug}:{module:string;slug:string}){
 const config=configs[module];
 const access=useNetworkAccess();
 const [networkId,setNetworkId]=useState("");
 const [items,setItems]=useState<Item[]>([]);
 const [dialog,setDialog]=useState(false);
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Alle");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [attendanceEvent,setAttendanceEvent]=useState<Item|null>(null);
 const [attendance,setAttendance]=useState<Attendance[]>([]);

 useEffect(()=>{void load()},[module,slug,access?.networkId]);
 async function load(){
  const token=getPortalSession();if(!token||!config){setNotice("Bitte melden Sie sich erneut an.");return}
  try{
   if(!access?.networkId)return;
   setNetworkId(access.networkId);
   setItems(await portalRequest<Item[]>(`/networks/${access.networkId}/content?type=${config.type}`,{token}));
  }catch(error){setNotice(error instanceof Error?error.message:"Die Netzwerkdaten konnten nicht geladen werden.")}
 }
 const visible=useMemo(()=>items.filter(item=>(filter==="Alle"||labels[item.status]===filter)&&`${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())),[items,query,filter]);
 if(!config)return null;
 const memberCanCreate=["kommunikation","matching","themen"].includes(module);
 const canCreate=Boolean(!access?.readOnly&&(access?.canManage||memberCanCreate));

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
 async function openAttendance(item:Item){const token=getPortalSession();if(!token||!networkId)return;try{setAttendance(await portalRequest<Attendance[]>(`/networks/${networkId}/events/${item.id}/attendance`,{token}));setAttendanceEvent(item)}catch(error){setNotice(error instanceof Error?error.message:"Teilnahmeliste konnte nicht geladen werden.")}}
 async function saveOwnAttendance(event:FormEvent<HTMLFormElement>){event.preventDefault();const token=getPortalSession();if(!token||!attendanceEvent)return;const form=new FormData(event.currentTarget);try{await portalRequest(`/networks/${networkId}/events/${attendanceEvent.id}/attendance/self`,{token,body:Object.fromEntries(form)});await openAttendance(attendanceEvent);setNotice("Ihre Rückmeldung wurde gespeichert.")}catch(error){setNotice(error instanceof Error?error.message:"Rückmeldung konnte nicht gespeichert werden.")}}
 async function markAttendance(row:Attendance,value:"present"|"absent"){const token=getPortalSession();if(!token||!attendanceEvent)return;await portalRequest(`/networks/${networkId}/events/${attendanceEvent.id}/attendance/${row.membershipId}`,{token,body:{response:row.response,attendance:value,guestNames:row.guestNames,companionCount:row.companionCount,note:row.note}});await openAttendance(attendanceEvent)}
 function exportAttendance(kind:"excel"|"pdf"){if(!attendanceEvent)return;const rows=[["Mitglied","Unternehmen","Rückmeldung","Anwesenheit","Begleitpersonen","Gäste"],...attendance.map(x=>[x.memberName,x.organizationName,x.response==="registered"?"Angemeldet":"Abgemeldet",x.attendance==="present"?"Anwesend":x.attendance==="absent"?"Abwesend":"Offen",String(x.companionCount),x.guestNames.join(", ")])];const table=`<table>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;if(kind==="excel"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff",table],{type:"application/vnd.ms-excel"}));a.download=`anwesenheit-${attendanceEvent.title}.xls`;a.click();URL.revokeObjectURL(a.href)}else{const win=window.open("","_blank");if(win){win.document.write(`<title>Anwesenheitsliste</title><h1>${attendanceEvent.title}</h1>${table}<script>print();close();<\/script>`);win.document.close()}}}
 function exportCsv(){
  const rows=[["Titel","Beschreibung","Status","Start","Aktualisiert"],...visible.map(item=>[item.title,item.description,labels[item.status],item.startsAt||"",item.updatedAt])];
  const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(";")).join("\n");
  const link=document.createElement("a");link.href=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));link.download=`${module}-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
 }

 return <div className="networkFunctionalWorkspace">
  <div className="networkMemberToolbar">
   <label><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={`${config.plural} durchsuchen`}/></label>
   <select value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Status filtern"><option>Alle</option>{Object.values(labels).map(label=><option key={label}>{label}</option>)}</select>
   {canCreate&&<button className="networkPrimary" type="button" onClick={()=>setDialog(true)}>＋ {config.singular} anlegen</button>}
  </div>
  <div className="networkMemberStats"><button className={filter==="Alle"?"active":""} onClick={()=>setFilter("Alle")}><strong>{items.length}</strong><span>Gesamt</span></button>{(["published","active","completed"] as const).map(value=><button key={value} className={filter===labels[value]?"active":""} onClick={()=>setFilter(labels[value])}><strong>{items.filter(item=>item.status===value).length}</strong><span>{labels[value]}</span></button>)}</div>
  <section className="networkCard">
   <header><div><span>NETZWERKMODUL</span><h2>{config.plural}</h2></div><button type="button" onClick={exportCsv} disabled={!visible.length}>CSV exportieren</button></header>
   <div className="networkContentRows">{visible.map(item=><article key={item.id}><div><span className={`networkMemberStatus ${item.status}`}>{labels[item.status]}</span><h3>{item.title}</h3><p>{item.description}</p><small>{item.startsAt?new Date(item.startsAt).toLocaleString("de-DE"):"Ohne Termin"} · {item.visibility==="administrators"?"Nur Verwaltung":"Alle Mitglieder"}</small></div><div className="networkRowActions">{module==="veranstaltungen"&&<button onClick={()=>void openAttendance(item)} title="Teilnahme und Anwesenheit" aria-label="Teilnahme und Anwesenheit">♙</button>}{item.status!=="published"&&item.status!=="completed"&&<button onClick={()=>void change(item,"published")} title="Veröffentlichen" aria-label="Veröffentlichen">✓</button>}{item.status!=="completed"&&<button onClick={()=>void change(item,"completed")} title="Erledigen" aria-label="Erledigen">○</button>}{item.status!=="archived"&&<button onClick={()=>void change(item,"archived")} title="Archivieren" aria-label="Archivieren">⌑</button>}</div></article>)}</div>
   {!visible.length&&<div className="networkEmpty"><b>{config.empty}</b><p>{canCreate?"Legen Sie den ersten Eintrag an oder ändern Sie den Filter.":"Sobald Inhalte freigegeben wurden, erscheinen sie hier."}</p>{canCreate&&<button className="networkPrimary" onClick={()=>setDialog(true)}>＋ Jetzt {config.singular.toLowerCase()} anlegen</button>}</div>}
  </section>
  {canCreate&&dialog&&<div className="networkModalBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setDialog(false)}}><section className="networkModal networkContentModal" role="dialog" aria-modal="true">
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
  {attendanceEvent&&<div className="networkModalBackdrop"><section className="networkModal networkContentModal" role="dialog" aria-modal="true"><header><div><span>VERANSTALTUNG</span><h2>Anwesenheit · {attendanceEvent.title}</h2></div><button onClick={()=>setAttendanceEvent(null)}>×</button></header><form onSubmit={saveOwnAttendance}><div><label>Meine Rückmeldung<select name="response"><option value="registered">Ich nehme teil</option><option value="declined">Ich nehme nicht teil</option></select></label><label>Begleitpersonen<input name="companionCount" type="number" min="0" max="20" defaultValue="0"/></label></div><label>Gäste – ein Name pro Zeile<textarea name="guestNames" rows={2}/></label><label>Hinweis zur Teilnahme<textarea name="note" rows={2}/></label>{!access?.readOnly&&<button className="networkPrimary">Rückmeldung speichern</button>}</form>{access?.canManage&&<><header><div><span>ANWESENHEITSLISTE</span><h3>Tatsächliche Teilnahme dokumentieren</h3></div><div><button onClick={()=>exportAttendance("pdf")}>PDF</button><button onClick={()=>exportAttendance("excel")}>Excel</button></div></header><div className="networkContentRows">{attendance.map(row=><article key={row.id}><div><h3>{row.memberName}</h3><p>{row.organizationName} · {row.response==="registered"?"Angemeldet":"Abgemeldet"} · {row.companionCount} Begleitpersonen</p><small>{row.guestNames.join(", ")||"Keine Gäste"}</small></div><div className="networkRowActions"><button className={row.attendance==="present"?"active":""} onClick={()=>void markAttendance(row,"present")} title="Anwesend">✓</button><button className={row.attendance==="absent"?"active":""} onClick={()=>void markAttendance(row,"absent")} title="Abwesend">×</button></div></article>)}</div></>}</section></div>}
  {notice&&<div className="networkNotice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Meldung schließen">×</button></div>}
 </div>;
}
