"use client";
import "./account-settings.css";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MemberBillingAccount } from "./member-billing-account";
import { AccountIcon } from "./account-icon";
import { clearPortalSession, getPortalSession, portalRequest } from "../lib/portal-api";

type Account = { email:string; pendingEmail:string|null; emailMfa:boolean; welcomeMail:boolean };
type Tab = "security"|"billing"|"notifications";
const tabs = [
  {id:"security" as const,label:"Zugang & Sicherheit",icon:"shield" as const},
  {id:"billing" as const,label:"Mitgliedschaft & Rechnungen",icon:"receipt" as const},
  {id:"notifications" as const,label:"Mitteilungen & Guthaben",icon:"gift" as const},
];
export function AccountSettingsWorkspace({networkSlug}:{networkSlug?:string}) {
  const [account,setAccount]=useState<Account|null>(null),[busy,setBusy]=useState(false),
    [notice,setNotice]=useState(""),[done,setDone]=useState(false),[tab,setTab]=useState<Tab>("security"),
    [challenge,setChallenge]=useState(""),[credits,setCredits]=useState<{network:string;available:number;redeemed:number}[]|null>(null);
  const login=networkSlug ? "/registrieren?network="+encodeURIComponent(networkSlug)+"&mode=login" : "/anmelden";
  async function load() {
    const token=getPortalSession();
    if(!token){setNotice("Bitte melde dich erneut an.");return;}
    try {setAccount(await portalRequest<Account>("/auth/account",{token,body:{}}));}
    catch(e){setNotice(e instanceof Error ? e.message : "Kontodaten konnten nicht geladen werden.");}
    try {setCredits(await portalRequest("/networks/account/referral-balance",{token}));}
    catch {setCredits(null);}
  }
  useEffect(()=>{void load();},[]);
  async function submit(event:FormEvent<HTMLFormElement>,kind:"password"|"email"|"cancel") {
    event.preventDefault();
    const element=event.currentTarget,form=new FormData(element),token=getPortalSession();
    if(!token)return;
    setBusy(true);setNotice("");
    try {
      await portalRequest(kind==="password"?"/auth/password/change":kind==="email"?"/auth/email-change/request":"/auth/email-change/cancel",{token,body:Object.fromEntries(form)});
      element.reset();
      if(kind==="password"){clearPortalSession();setDone(true);}
      else {await load();setNotice(kind==="email"?"Bestätigungslink versendet. Deine bisherige Login-Adresse bleibt bis zur Bestätigung gültig.":"Die E-Mail-Änderung wurde abgebrochen.");}
    } catch(e){setNotice(e instanceof Error?e.message:"Änderung nicht möglich.");}
    finally{setBusy(false);}
  }
  async function changeMfa(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!account)return;
    const form=new FormData(e.currentTarget);setBusy(true);setNotice("");
    try {
      const result=await portalRequest<{challengeId?:string;changed?:boolean}>("/auth/account/mfa",{token:getPortalSession()||"",body:{enabled:!account.emailMfa,currentPassword:form.get("password"),challengeId:challenge||undefined,code:form.get("code")}});
      if(result.challengeId){setChallenge(result.challengeId);setNotice("Der Bestätigungscode wurde an deine E-Mail-Adresse gesendet.");}
      if(result.changed){clearPortalSession();window.location.assign(login);}
    } catch(e){setNotice(e instanceof Error?e.message:"Änderung fehlgeschlagen.");}
    finally{setBusy(false);}
  }
  if(done)return <div className="accountWorkspace"><section className="accountPanel"><div className="accountEmpty"><span className="accountPanelIcon"><AccountIcon name="check"/></span><h2>Passwort geändert</h2><p>Alle Sitzungen wurden beendet. Melde dich mit deinem neuen Passwort an.</p><Link className="accountButton" href={login as never}>Erneut anmelden</Link></div></section></div>;
  return <div className="accountWorkspace">
    <section className="accountIdentity" aria-label="Dein Konto">
      <span className="accountAvatar"><AccountIcon name="user"/></span>
      <div className="accountIdentityText"><span className="accountEyebrow">Dein persönlicher Zugang</span><h2>{account?.email || "Kontodaten werden geladen …"}</h2><p>Kontodaten, Mitgliedschaften und Sicherheit an einem Ort.</p></div>
      {account && <span className={"accountBadge "+(account.emailMfa?"positive":"")}><AccountIcon name="shield"/>{account.emailMfa?"Anmeldung mit E-Mail-Code":"Passwortgeschützter Zugang"}</span>}
    </section>
    <div className="accountTabs" role="tablist" aria-label="Kontobereiche">
      {tabs.map((item,i)=><button type="button" key={item.id} id={"account-tab-"+item.id} role="tab" aria-selected={tab===item.id} aria-controls={"account-panel-"+item.id} tabIndex={tab===item.id?0:-1}
        onClick={()=>{setTab(item.id);setNotice("");}}
        onKeyDown={e=>{let index=i;if(e.key==="ArrowRight")index=(i+1)%tabs.length;else if(e.key==="ArrowLeft")index=(i+tabs.length-1)%tabs.length;else if(e.key==="Home")index=0;else if(e.key==="End")index=tabs.length-1;else return;e.preventDefault();setTab(tabs[index].id);document.getElementById("account-tab-"+tabs[index].id)?.focus();}}>
        <AccountIcon name={item.icon}/><span>{item.label}</span>
      </button>)}
    </div>
    {notice && <p role="status" className="accountNotice">{notice}</p>}
    <div role="tabpanel" id="account-panel-security" aria-labelledby="account-tab-security" hidden={tab!=="security"}>
      <div className="accountSectionHeading"><h2>Zugang & Sicherheit</h2><p>Verwalte deine Anmeldung. Diese Angaben sind nicht öffentlich sichtbar.</p></div>
      <div className="accountSecurityGrid">
        <div className="accountStack">
          <section className="accountPanel">
            <header className="accountPanelHeader"><span className="accountPanelIcon"><AccountIcon name="mail"/></span><div><h3>Deine Login-Adresse</h3><p>Mit dieser E-Mail meldest du dich an.</p></div></header>
            <div className="accountPanelBody"><p className="accountFieldValue">{account?.email||"Wird geladen …"}</p><small>Die Kontaktadresse auf deiner Unternehmensseite bleibt davon unabhängig.</small></div>
            <details className="accountDetails"><summary>E-Mail-Adresse ändern</summary>
              <form className="accountForm" onSubmit={e=>void submit(e,"email")}>
                <label>Neue E-Mail-Adresse<input name="newEmail" type="email" autoComplete="email" required maxLength={250}/></label>
                <label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={200}/></label>
                <p>Du erhältst einen 30 Minuten gültigen Bestätigungslink an die neue Adresse. Erst nach Bestätigung mit deinem Passwort wird sie zur Login-Adresse. Deine bisherige Adresse erhält einen Sicherheitshinweis.</p>
                <button className="accountButton" disabled={busy||!account}>Bestätigungslink senden</button>
              </form>
            </details>
            {account?.pendingEmail && <div className="accountPanelBody"><p className="accountNotice">Bestätigung ausstehend: {account.pendingEmail}</p><form className="accountForm" onSubmit={e=>void submit(e,"cancel")}><label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={200}/></label><button className="accountButton secondary" disabled={busy}>E-Mail-Änderung abbrechen</button></form></div>}
          </section>
          <section className="accountPanel">
            <header className="accountPanelHeader"><span className="accountPanelIcon"><AccountIcon name="key"/></span><div><h3>Dein Passwort</h3><p>Ändere dein Passwort sicher und persönlich.</p></div></header>
            <details className="accountDetails"><summary>Passwort ändern</summary>
              <form className="accountForm" onSubmit={e=>void submit(e,"password")}>
                <label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={200}/></label>
                <label>Neues Passwort<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={200}/><small>Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben, Zahl und Sonderzeichen.</small></label>
                <label>Neues Passwort wiederholen<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={200}/></label>
                <p>Nach dem Speichern wirst du auf allen Geräten abgemeldet.</p>
                <button className="accountButton" disabled={busy||!account}>Passwort sicher ändern</button>
              </form>
            </details>
          </section>
        </div>
        <div className="accountStack">
          <section className="accountPanel">
            <header className="accountPanelHeader"><span className="accountPanelIcon"><AccountIcon name="shield"/></span><div><h3>Anmeldung in zwei Schritten</h3><p>Zusätzlicher Schutz für deinen Zugang.</p></div></header>
            <div className="accountPanelBody">
              <span className={"accountBadge "+(account?.emailMfa?"positive":"attention")}>{account?account.emailMfa?"Aktiviert":"Optional · nicht aktiviert":"Wird geladen …"}</span>
              <p>Wenn du diese Funktion aktivierst, erhältst du bei jeder Anmeldung einen sechsstelligen Code per E-Mail. Erst mit diesem Code wird der Zugang geöffnet.</p>
            </div>
            <details className="accountDetails" open={challenge?true:undefined}>
              <summary>{account?.emailMfa?"Anmeldung mit Code verwalten":"Zusätzlichen Schutz aktivieren"}</summary>
              <form className="accountForm" onSubmit={e=>void changeMfa(e)}>
                {challenge?<label>Code aus der E-Mail<input name="code" key="code" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}/></label>:<label>Aktuelles Passwort<input name="password" key="password" type="password" autoComplete="current-password" required maxLength={200}/></label>}
                <div className="accountButtonRow"><button className="accountButton" disabled={busy||!account}>{challenge?"Code bestätigen":account?.emailMfa?"Deaktivierung bestätigen lassen":"Aktivierung bestätigen lassen"}</button>
                {challenge && <button type="button" className="accountButton secondary" onClick={()=>{setChallenge("");setNotice("");}}>Abbrechen</button>}</div>
                <p>Die Änderung wird erst nach Bestätigung des E-Mail-Codes übernommen. Danach meldest du dich erneut an.</p>
              </form>
            </details>
          </section>
          <aside className="accountSecurityTip">Deine Zugangsdaten gelten nur für dein eigenes Konto. Gib Passwort und Sicherheitscodes nicht weiter.</aside>
        </div>
      </div>
    </div>
    <div role="tabpanel" id="account-panel-billing" aria-labelledby="account-tab-billing" hidden={tab!=="billing"}>
      <div className="accountSectionHeading"><h2>Mitgliedschaft & Rechnungen</h2><p>Deine Laufzeiten, Beiträge und Rechnungen übersichtlich zusammengefasst.</p></div>
      <MemberBillingAccount/>
    </div>
    <div role="tabpanel" id="account-panel-notifications" aria-labelledby="account-tab-notifications" hidden={tab!=="notifications"}>
      <div className="accountSectionHeading"><h2>Mitteilungen & Guthaben</h2><p>Entscheide, was du per E-Mail erhältst, und behalte deine Empfehlungen im Blick.</p></div>
      <div className="accountSecurityGrid">
        <section className="accountPanel"><header className="accountPanelHeader"><span className="accountPanelIcon"><AccountIcon name="mail"/></span><div><h3>Neue Netzwerk-Mitglieder</h3><p>Bleib über neue Unternehmensseiten informiert.</p></div></header>
          <div className="accountPanelBody"><label className="accountConsent"><input type="checkbox" checked={account?.welcomeMail||false} disabled={busy||!account} onChange={async e=>{const enabled=e.target.checked;setBusy(true);setNotice("");try{setAccount(await portalRequest<Account>("/auth/account/welcome-mail",{token:getPortalSession()||"",body:{enabled}}));setNotice("Deine E-Mail-Einstellung wurde gespeichert.");}catch{setNotice("Einstellung konnte nicht gespeichert werden.");}finally{setBusy(false);}}}/><span><strong>Per E-Mail informieren</strong><small>Ich möchte erfahren, wenn neue Unternehmensseiten in meinen Netzwerken veröffentlicht werden.</small></span></label></div>
        </section>
        <section className="accountPanel"><header className="accountPanelHeader"><span className="accountPanelIcon"><AccountIcon name="gift"/></span><div><h3>Deine Empfehlungen</h3><p>Dein vorgemerktes Guthaben je Netzwerk.</p></div></header>
          {credits===null?<div className="accountPanelBody"><p className="accountMuted">Guthaben konnte noch nicht geladen werden.</p><button type="button" className="accountButton secondary" disabled={busy} onClick={()=>void load()}>Erneut laden</button></div>:credits.length?<div className="accountPanelBody accountCreditList">{credits.map((c,i)=><div key={i} className="accountCreditItem"><div><strong>{c.network}</strong><small>{c.available===1?"Freimonat verfügbar":"Freimonate verfügbar"} · {c.redeemed} verrechnet</small></div><span className="accountCreditNumber">{c.available}</span></div>)}</div>:<div className="accountEmpty"><span className="accountPanelIcon"><AccountIcon name="gift"/></span><h3>Noch kein Guthaben vorgemerkt</h3><p>Gutschriften aus erfolgreichen Empfehlungen erscheinen hier.</p></div>}
        </section>
      </div>
    </div>
  </div>;
}
