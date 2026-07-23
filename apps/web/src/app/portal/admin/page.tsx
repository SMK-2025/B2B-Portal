import {AdminReviewWorkspace} from "../../components/admin-review-workspace";
import {AdminMembersWorkspace} from "../../components/admin-members-workspace";
import {PortalEmpty,PortalPanel,PortalShell} from "../../components/portal-shell";
import Link from "next/link";

export default function AdminPortal(){
 return <PortalShell role="admin" title="Prüfzentrum und Portalsteuerung" intro="Überblick über Mitglieder, Einreichungen, Qualität, technische Dienste und alle nächsten administrativen Aufgaben." action={<button className="portalPrimary">＋ Mitglied anlegen</button>}>
  <div className="portalSetup adminSetup">
   <div><span>PORTALBETRIEB</span><h2>Die zentralen Grundlagen sind aktiv. KI und Zahlung folgen als nächste Betriebsbausteine.</h2></div><b>80 %</b>
   <div className="setupBar"><i style={{width:"80%"}}/></div>
   <ol><li className="done">Portaloberfläche und Rollenbereiche</li><li className="done">Authentifizierung und PostgreSQL</li><li className="done">E-Mail-Versand und Domain</li><li>KI-Dienste und Zahlung konfigurieren</li></ol>
  </div>

  <AdminReviewWorkspace/>

  <PortalPanel id="rollentest" eyebrow="ROLLEN & QUALITÄTSSICHERUNG" title="Portal aus Nutzersicht prüfen">
   <div className="adminRolePreviews">
    <article>
     <span aria-hidden="true">DL</span>
     <div><h3>Dienstleister-Testansicht</h3><p>Leistungsprofil, Freigabestatus und Geschäftschancen mit sicheren Beispieldaten prüfen.</p></div>
     <Link className="portalIconCta" href="/portal/admin/test-dienstleister" title="Dienstleister-Testansicht öffnen" aria-label="Dienstleister-Testansicht öffnen">↗</Link>
    </article>
    <article>
     <span aria-hidden="true">NW</span>
     <div><h3>Netzwerk-Testansicht</h3><p>Eine vorhandene Netzwerk-Testumgebung auswählen und aus Sicht der Netzwerkverwaltung öffnen.</p></div>
     <Link className="portalIconCta" href="/portal/admin/netzwerke" title="Netzwerk-Testansichten öffnen" aria-label="Netzwerk-Testansichten öffnen">↗</Link>
    </article>
   </div>
  </PortalPanel>

  <div className="portalGrid equal adminDashboardLower">
   <div>
    <AdminMembersWorkspace/>
    <PortalPanel id="protokoll" eyebrow="NACHVOLLZIEHBARKEIT" title="Prüf- und Aktivitätsprotokoll">
     <div className="activity">
      <p><span/><small>System</small><strong>PostgreSQL-Persistenz verbunden</strong></p>
      <p><span/><small>Kommunikation</small><strong>SendGrid und Absenderdomain aktiviert</strong></p>
      <p><span/><small>Prüfung</small><strong>Zentrale Profil- und Bedarfswarteschlange aktiv</strong></p>
     </div>
    </PortalPanel>
    <PortalPanel id="kommunikation" eyebrow="KOMMUNIKATION" title="Meldungen und Benachrichtigungen">
     <PortalEmpty icon="✉" title="Keine offenen Systemmeldungen" text="Rückfragen, gemeldete Inhalte, fehlgeschlagene E-Mails und administrative Hinweise werden hier gebündelt."/>
    </PortalPanel>
   </div>
   <aside>
    <PortalPanel id="matches" title="Matching-Qualität">
     <PortalEmpty icon="◎" title="Noch keine freigegebenen Matchingdaten" text="Passungswerte, Freigabequoten und erfolgreiche Kontakte erscheinen, sobald geprüfte Bedarfe und Dienstleisterprofile zusammengeführt werden."/>
    </PortalPanel>
    <PortalPanel title="Portalstatus">
     <div className="systemRows">
      <p><span><i className="ok"/>Web-Anwendung</span><b>Bereit</b></p>
      <p><span><i className="ok"/>Authentifizierung</span><b>Aktiv</b></p>
      <p><span><i className="ok"/>PostgreSQL</span><b>Aktiv</b></p>
      <p><span><i className="ok"/>E-Mail-Versand</span><b>Aktiv</b></p>
      <p><span><i className="warn"/>KI-Verarbeitung</span><b>Offen</b></p>
      <p><span><i className="warn"/>Zahlungsanbieter</span><b>Offen</b></p>
     </div>
    </PortalPanel>
    <PortalPanel title="Nächste Einrichtungsaufgaben">
     <div className="taskRows">
      <label><input type="checkbox" defaultChecked/>Authentifizierung produktiv</label>
      <label><input type="checkbox" defaultChecked/>Datenbank und Sicherung aktiv</label>
      <label><input type="checkbox" defaultChecked/>E-Mail-Versand freigegeben</label>
      <label><input type="checkbox"/>KI-Anbieter verbinden</label>
      <label><input type="checkbox"/>Tarife und Zahlungsanbieter konfigurieren</label>
     </div>
    </PortalPanel>
   </aside>
  </div>
 </PortalShell>;
}
