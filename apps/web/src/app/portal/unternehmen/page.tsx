import {PortalEmpty,PortalPanel,PortalShell,PortalStats} from "../../components/portal-shell";
import {EntrepreneurProfilePanel,EntrepreneurSetupStatus} from "../../components/entrepreneur-profile-status";
export default function UnternehmenPortal(){return <PortalShell role="unternehmen" title="Willkommen in Ihrem Unternehmensbereich." intro="Richten Sie Ihr Profil ein und veröffentlichen Sie anschließend Ihren ersten geschäftlichen Bedarf." action={<button className="portalPrimary">＋ Neuen Bedarf erstellen</button>}>
<EntrepreneurSetupStatus/>
<PortalStats items={[["0","Aktive Bedarfe","Noch keine Einträge"],["0","Matches","Startet nach Veröffentlichung"],["0","Nachrichten","Keine neuen Nachrichten"],["0","Bedarfsaufrufe","Noch keine Aufrufe"]]}/>
<div className="portalGrid wideLeft"><div>
<PortalPanel id="bedarfe" eyebrow="BEDARFSMANAGEMENT" title="Meine Bedarfe" action={<button className="portalLink">Bedarfsverwaltung öffnen →</button>}><PortalEmpty icon="◇" title="Noch kein Bedarf angelegt" text="Beschreiben Sie die gesuchte Dienstleistung manuell oder lassen Sie sich von der KI durch die Bedarfserstellung führen." action="Ersten Bedarf erstellen"/></PortalPanel>
<PortalPanel id="matches" eyebrow="MATCHING" title="Passende Dienstleister"><PortalEmpty icon="◎" title="Noch keine Matches" text="Sobald ein geprüfter Bedarf aktiv ist, sucht das System wiederkehrend nach passenden Dienstleistern. Sie entscheiden zuerst, wer Ihren Bedarf sehen darf."/></PortalPanel>
<PortalPanel id="historie" eyebrow="AKTIVITÄTSDOKUMENTATION" title="Ihre Historie"><PortalEmpty icon="↗" title="Noch keine Aktivitäten" text="Profilaufrufe, Entscheidungen, Statusänderungen und Kontakte werden künftig hier nachvollziehbar dokumentiert."/></PortalPanel>
</div><aside>
<PortalPanel title="KI-Bedarfsassistent" className="portalAi"><span className="aiMark">✦</span><h3>Aus einer Idee wird ein klarer Bedarf.</h3><p>Beschreiben Sie Ihr Ziel. Die KI strukturiert Leistungsumfang, Kriterien, Zeitraum und wichtige Rückfragen.</p><button className="portalPrimary">Bedarf mit KI erstellen</button></PortalPanel>
<EntrepreneurProfilePanel/>
<PortalPanel id="favoriten" title="Favoriten"><PortalEmpty icon="☆" title="Keine Favoriten" text="Gespeicherte Dienstleister erscheinen an dieser Stelle."/></PortalPanel>
<PortalPanel id="aufrufe" title="Bedarfsreichweite"><PortalEmpty icon="◫" title="Keine Aufrufdaten" text="Nach Aktivierung eines Bedarfs sehen Sie hier seine qualifizierten Aufrufe."/></PortalPanel>
</aside></div></PortalShell>}
