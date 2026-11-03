"use client";
import {useRef,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";
export function NetworkReferralButton({networkId}:{networkId:string}){
  const [busy,setBusy]=useState(false);
  const referralDialog=useRef<HTMLDialogElement>(null);
  const [referralLink,setReferralLink]=useState(""),[recipient,setRecipient]=useState(""),[permission,setPermission]=useState(false),[feedback,setFeedback]=useState("");
  async function recommend(send:boolean) {
    setBusy(true); setFeedback("");
    try {
      const {path}=await portalRequest<{path:string}>(`/networks/${networkId}/referral`,{token:getPortalSession()||"",body:send?{email:recipient,permission}:{}});
      const link=new URL(path,window.location.origin).href; setReferralLink(link);
      if(send){setRecipient("");setPermission(false);setFeedback("Empfehlung versendet.");}
      else {try{await navigator.clipboard.writeText(link);setFeedback("Persönlicher Link kopiert.");}catch{setFeedback("Bitte den persönlichen Link unten kopieren.");}}
    } catch(e){setFeedback(e instanceof Error?e.message:"Empfehlung fehlgeschlagen.");} finally{setBusy(false);}
  }
  return <>
    <button className="networkReferralNavAction" type="button" aria-haspopup="dialog" onClick={()=>{setFeedback("");setReferralLink("");setPermission(false);setRecipient("");referralDialog.current?.showModal();}}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="7" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2m3-15v8m-4-4h8"/></svg>Netzwerk empfehlen</button>
      <dialog ref={referralDialog} aria-label="Netzwerk empfehlen" className="adminUsersDialog" style={{maxWidth:520}}>
        <h2>Netzwerk empfehlen</h2><p>Teile deinen persönlichen Link oder verschicke ihn per E-Mail.</p>
        <form className="formGrid" onSubmit={e=>{e.preventDefault();void recommend(true);}}>
          <label>E-Mail des Empfängers<input type="email" required value={recipient} onChange={e=>setRecipient(e.target.value)}/></label>
          <label><input type="checkbox" required checked={permission} onChange={e=>setPermission(e.target.checked)}/> Der Empfänger hat dieser Einladung per E-Mail bereits zugestimmt.</label>
          <button disabled={busy} className="portalPrimary">Empfehlung senden</button>
        </form>
        <button disabled={busy} onClick={()=>recommend(false)}>Persönlichen Link kopieren</button>
        {referralLink && <input aria-label="Persönlicher Empfehlungslink" readOnly value={referralLink} onFocus={e=>e.target.select()}/>}
        <p role="status">{feedback}</p><button onClick={()=>referralDialog.current?.close()}>Schließen</button>
      </dialog>
  </>;
}
