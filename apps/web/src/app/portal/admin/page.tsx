import {AdminReviewWorkspace} from "../../components/admin-review-workspace";
import {AdminMembersWorkspace} from "../../components/admin-members-workspace";
import {PortalPanel,PortalShell} from "../../components/portal-shell";
import Link from "next/link";

export default function AdminPortal(){
 return <PortalShell role="admin" title="Prüfzentrum und Portalsteuerung" intro="Überblick über Mitglieder, Einreichungen, Qualität, technische Dienste und alle nächsten administrativen Aufgaben.">
  <AdminReviewWorkspace/>

  <PortalPanel id="rollentest" eyebrow="ROLLEN & QUALITÄTSSICHERUNG" title="Portal aus Nutzersicht prüfen">
   <div className="adminRolePreviews">
    <article>
     <span aria-hidden="true">DL</span>
     <div><h3>Dienstleisterkonten prüfen</h3><p>Tatsächliche Dienstleisterkonten, Leistungsprofile und freigegebene Geschäftschancen kontrollieren.</p></div>
     <Link className="portalIconCta" href="/portal/admin/test-dienstleister" title="Dienstleisterkonten öffnen" aria-label="Dienstleisterkonten öffnen">↗</Link>
    </article>
    <article>
     <span aria-hidden="true">NW</span>
     <div><h3>Netzwerk-Testansicht</h3><p>Eine vorhandene Netzwerk-Testumgebung auswählen und aus Sicht der Netzwerkverwaltung öffnen.</p></div>
     <Link className="portalIconCta" href="/portal/admin/netzwerke" title="Netzwerk-Testansichten öffnen" aria-label="Netzwerk-Testansichten öffnen">↗</Link>
    </article>
   </div>
  </PortalPanel>

  <AdminMembersWorkspace/>
 </PortalShell>;
}
