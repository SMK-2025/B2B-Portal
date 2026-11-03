"use client";
import {useRef,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";
export function NetworkReferralButton({networkId}:{networkId:string}){
  const [busy,setBusy]=useState(false);
  const referralDialog=useRef<HTMLDialogElement>(null);
  const [referralLink,setReferralLink]=useState(""),[recipient,setRecipient]=useState(""),[informed,setInformed]=useState(false),[feedback,setFeedback]=useState("");
  async function recommend(send:boolean) {
    setBusy(true); setFeedback("");
    try {
      const {path}=await portalRequest<{path:string}>(`/networks/${networkId}/referral`,{token:getPortalSession()||"",body:send?{email:recipient,permission:true}:{}});
      const link=new URL(path,window.location.origin).href; setReferralLink("");
      if(send){setRecipient("");setInformed(false);setFeedback("Empfehlung versendet.");}
      else {try{await navigator.clipboard.writeText(link);setFeedback("Persönlicher Link kopiert.");}catch{setReferralLink(link);setFeedback("Bitte den Link im Feld kopieren.");}}
    } catch(e){setFeedback(e instanceof Error?e.message:"Empfehlung fehlgeschlagen.");} finally{setBusy(false);}
  }
  return <>
    <button className="networkReferralNavAction" type="button" aria-haspopup="dialog" onClick={()=>{setFeedback("");setReferralLink("");setInformed(false);setRecipient("");referralDialog.current?.showModal();}}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="7" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2m3-15v8m-4-4h8"/></svg>Netzwerk empfehlen</button>
      <dialog ref={referralDialog} aria-labelledby="referral-title" className="referralDialog">
        <div className="referralHeader">
          <div><span className="referralEyebrow">Persönliche Einladung</span><h2 id="referral-title">Netzwerk empfehlen</h2></div>
          <button type="button" className="referralClose" aria-label="Schließen" onClick={()=>referralDialog.current?.close()}>×</button>
        </div>
        <div className="referralBody">
          <p>Lade jemanden per E-Mail ein oder teile deinen persönlichen Empfehlungslink.</p>
          <form onSubmit={e=>{e.preventDefault();if(!busy) void recommend(true);}}>
            <label className="referralField">E-Mail-Adresse des Empfängers
              <input type="email" placeholder="name@unternehmen.de" required value={recipient} onChange={e=>setRecipient(e.target.value)}/>
            </label>
            <label className="referralConsent"><input type="checkbox" required checked={informed} onChange={e=>setInformed(e.target.checked)}/><span>Der Empfänger wurde bereits über die Einladung informiert.</span></label>
            <small>Mit dem Versand bestätigst du, dass der Empfänger die Einladung per E-Mail erhalten möchte.</small>
            <button className="referralSend" disabled={busy}>Empfehlung senden</button>
          </form>
          <div className="referralDivider">oder</div>
          <button className="referralCopy" type="button" disabled={busy} onClick={()=>recommend(false)}>Persönlichen Link kopieren</button>
          {referralLink && <input className="referralFallback" aria-label="Persönlicher Empfehlungslink" readOnly value={referralLink} onFocus={e=>e.target.select()}/>}
          <div role="status">{feedback}</div>
        </div>
      </dialog>
  </>;
}
