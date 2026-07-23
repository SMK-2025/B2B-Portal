"use client";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {Suspense,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";
function TeamInvitationContent(){
 const params=useSearchParams(),token=params.get("token")||"",session=getPortalSession(),[status,setStatus]=useState("");
 async function accept(){if(!session)return;try{await portalRequest("/organizations/team-invitations/accept",{token:session,body:{token}});setStatus("Die Einladung wurde angenommen. Sie können das Unternehmenskonto jetzt öffnen.")}catch(error){setStatus(error instanceof Error?error.message:"Die Einladung konnte nicht angenommen werden.")}}
 const redirect=`/team-einladung?token=${encodeURIComponent(token)}`;
 return <main className="authPage"><section className="authCard" aria-labelledby="invitation-title"><small>SICHERER TEAMZUGANG</small><h1 id="invitation-title">Einladung zum Unternehmenskonto</h1><p>Der Zugang wird erst nach Ihrer ausdrücklichen Bestätigung aktiviert und ist an die eingeladene E-Mail-Adresse gebunden.</p>{status&&<p className="portalNotice" role="status">{status}</p>}{!token?<p role="alert">Der Einladungslink ist unvollständig.</p>:session?<button className="portalPrimary" type="button" onClick={()=>void accept()}>Einladung verbindlich annehmen</button>:<Link className="portalPrimary" href={`/anmelden?redirect=${encodeURIComponent(redirect)}`}>Anmelden und Einladung prüfen</Link>}<Link className="portalSecondary" href="/portal/unternehmen">Zum Unternehmensbereich</Link></section></main>
}
export default function TeamInvitationPage(){return <Suspense fallback={<main className="authPage"><p role="status">Einladung wird geprüft …</p></main>}><TeamInvitationContent/></Suspense>}
