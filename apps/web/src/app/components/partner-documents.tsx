"use client";
import { useState } from "react";
import "./partner-documents.css";

export type PartnerDocument = { id:string; name:string; mimeType:string; size:number; dataUrl:string };
export function PartnerDocuments({documents}:{documents:PartnerDocument[]}) {
  function download(doc:PartnerDocument) {
    const bytes=Uint8Array.from(atob(doc.dataUrl.split(",")[1]),c=>c.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
    const a=document.createElement("a"); a.href=url; a.download=doc.name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="partnerDocumentList">{documents.map(doc=><button type="button" key={doc.id} className="partnerDocument" onClick={()=>download(doc)}><span className="partnerDocumentIcon" aria-hidden="true">PDF</span><span><strong>{doc.name}</strong><small>{Math.ceil(doc.size/1000)} KB · Herunterladen</small></span><span aria-hidden="true">↓</span></button>)}</div>;
}
export function PartnerDocumentsEditor({value,onChange,disabled,onBusyChange}:{value:PartnerDocument[];onChange:(v:PartnerDocument[])=>void;disabled?:boolean;onBusyChange?:(v:boolean)=>void}) {
  const [error,setError]=useState(""),[reading,setReading]=useState(false);
  async function add(files:FileList|null) {
    if(!files?.length)return;
    setError("");
    if(value.length+files.length>5){setError("Bitte höchstens fünf Dokumente hinterlegen.");return;}
    if([...files].some(f=>f.type!=="application/pdf"||f.size>1500000||!f.size)){setError("Bitte PDF-Dateien mit jeweils maximal 1,5 MB auswählen.");return;}
    setReading(true);onBusyChange?.(true);
    try {
      const docs=await Promise.all([...files].map(async file=>{
        const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Die Datei konnte nicht gelesen werden."));reader.readAsDataURL(file);});
        return {id:crypto.randomUUID(),name:file.name,mimeType:file.type,size:file.size,dataUrl};
      }));
      onChange([...value,...docs]);
    } catch(e){setError(e instanceof Error?e.message:"Die Datei konnte nicht gelesen werden.");}
    finally{setReading(false);onBusyChange?.(false);}
  }
  return <div className="partnerDocumentEditor">
    <p>Präsentationen, Broschüren oder weitere Unterlagen für die Mitglieder dieses Netzwerks. Bis zu fünf PDF-Dateien, jeweils maximal 1,5 MB.</p>
    {value.map(doc=><div className="partnerDocument" key={doc.id}><span className="partnerDocumentIcon">PDF</span><span><strong>{doc.name}</strong><small>{Math.ceil(doc.size/1000)} KB</small></span><button type="button" disabled={disabled||reading} aria-label={doc.name+" entfernen"} onClick={()=>onChange(value.filter(d=>d.id!==doc.id))}>Entfernen</button></div>)}
    <label className="partnerDocumentUpload"><span>{reading?"Dateien werden vorbereitet …":"+ PDF-Dokumente auswählen"}</span><input type="file" accept="application/pdf,.pdf" multiple disabled={disabled||reading||value.length>=5} onChange={e=>{void add(e.currentTarget.files);e.currentTarget.value="";}}/></label>
    {error&&<p role="alert">{error}</p>}
  </div>;
}
