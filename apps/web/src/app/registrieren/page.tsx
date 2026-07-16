"use client";

import { FormEvent, useState } from "react";

type Step = "account" | "verify" | "organization" | "submitted";

export default function RegistrationPage() {
  const [step,setStep]=useState<Step>("account");
  const [message,setMessage]=useState("");
  const [verificationToken,setVerificationToken]=useState("");
  const [sessionToken,setSessionToken]=useState("");
  const [credentials,setCredentials]=useState({email:"",password:""});
  const api=process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  async function request(path:string,body:unknown,token?:string){
    const response=await fetch(`${api}/api${path}`,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
    const data=await response.json(); if(!response.ok) throw new Error(data.message ?? "Die Anfrage konnte nicht verarbeitet werden."); return data;
  }

  async function register(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setMessage(""); const form=new FormData(event.currentTarget);
    try { const password=String(form.get("password")); const email=String(form.get("email")); const result=await request("/auth/register",{firstName:form.get("firstName"),lastName:form.get("lastName"),email,password}); setCredentials({email,password}); setVerificationToken(result.verificationToken); setStep("verify"); }
    catch(error){setMessage(error instanceof Error?error.message:"Unbekannter Fehler");}
  }

  async function verify(){
    try { await request("/auth/verify-email",{token:verificationToken}); const login=await request("/auth/login",credentials); setSessionToken(login.token); setStep("organization"); }
    catch(error){setMessage(error instanceof Error?error.message:"Unbekannter Fehler");}
  }

  async function createOrganization(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setMessage(""); const form=new FormData(event.currentTarget);
    try { const organization=await request("/organizations",{legalName:form.get("legalName"),displayName:form.get("displayName"),role:form.get("role"),websiteUrl:form.get("websiteUrl")},sessionToken); await request(`/organizations/${organization.id}/submit`,{},sessionToken); setStep("submitted"); }
    catch(error){setMessage(error instanceof Error?error.message:"Unbekannter Fehler");}
  }

  return <main className="authShell"><a className="brand authBrand" href="/">B2B<span>Match</span></a><section className="authCard">
    <p className="eyebrow">SCHRITT {step==="account"?"1":step==="verify"?"2":step==="organization"?"3":"4"} VON 4</p>
    {step==="account"&&<><h1>Konto erstellen</h1><p className="lead">Starten Sie mit Ihrer geschäftlichen Identität.</p><form onSubmit={register} className="formGrid"><label>Vorname<input name="firstName" required minLength={2}/></label><label>Nachname<input name="lastName" required minLength={2}/></label><label className="full">Geschäftliche E-Mail<input name="email" type="email" required/></label><label className="full">Passwort<input name="password" type="password" required minLength={12}/><small>Mindestens 12 Zeichen</small></label><button className="primary full">Konto erstellen</button></form></>}
    {step==="verify"&&<><h1>E-Mail bestätigen</h1><p className="lead">Im lokalen Test wird der Bestätigungscode direkt bereitgestellt. Im späteren Betrieb kommt er per E-Mail.</p><div className="codeBox">{verificationToken}</div><button className="primary wide" onClick={verify}>E-Mail jetzt bestätigen</button></>}
    {step==="organization"&&<><h1>Unternehmen anlegen</h1><p className="lead">Das Profil wird anschließend zur Prüfung eingereicht.</p><form onSubmit={createOrganization} className="formGrid"><label className="full">Rechtlicher Firmenname<input name="legalName" required/></label><label className="full">Anzeigename<input name="displayName" required/></label><label className="full">Homepage<input name="websiteUrl" type="url" placeholder="https://"/></label><label className="full">Nutzung<select name="role" defaultValue="both"><option value="buyer">Dienstleistungen suchen</option><option value="provider">Dienstleistungen anbieten</option><option value="both">Beides</option></select></label><button className="primary full">Profil zur Prüfung einreichen</button></form></>}
    {step==="submitted"&&<div className="success"><div className="check">✓</div><h1>Profil eingereicht</h1><p className="lead">Ihr Unternehmen ist noch nicht öffentlich und nimmt noch nicht am Matching teil. Nach der Adminprüfung erhalten Sie eine Rückmeldung.</p><a className="secondary linkButton" href="/">Zur Übersicht</a></div>}
    {message&&<p className="error" role="alert">{message}</p>}
  </section></main>;
}
