import {EntrepreneurDashboardData} from "../../components/entrepreneur-dashboard-data";
import {EntrepreneurNeedsPanel,EntrepreneurProfilePanel,EntrepreneurSetupStatus} from "../../components/entrepreneur-profile-status";
import {PortalEmpty,PortalPanel,PortalShell} from "../../components/portal-shell";

export default function UnternehmenPortal(){
 return <PortalShell role="unternehmen" title="Willkommen in Ihrem Unternehmensbereich." intro="Richten Sie Ihr Profil ein und veröffentlichen Sie anschließend Ihren ersten geschäftlichen Bedarf." action={<button className="portalPrimary">＋ Neuen Bedarf erstellen</button>}>
  <EntrepreneurSetupStatus/>
  <div className="portalGrid wideLeft"><div>
   <EntrepreneurNeedsPanel/>
   <EntrepreneurDashboardData/>
  </div><aside>
   <PortalPanel title="KI-Bedarfsassistent" className="portalAi"><span className="aiMark">✦</span><h3>Aus einer Idee wird ein klarer Bedarf.</h3><p>Beschreiben Sie Ihr Ziel. Der Assistent strukturiert Leistungsumfang, Kriterien, Zeitraum und wichtige Rückfragen.</p><button className="portalPrimary">Bedarf mit KI erstellen</button></PortalPanel>
   <EntrepreneurProfilePanel/>
   <PortalPanel id="favoriten" title="Favoriten"><PortalEmpty icon="☆" title="Keine Favoriten" text="Ihre tatsächlich gespeicherten Dienstleister verwalten Sie in der Favoritenansicht."/></PortalPanel>
  </aside></div>
 </PortalShell>;
}
