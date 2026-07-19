import {NeedsWorkspace} from "../../../components/needs-workspace";
import {PortalShell,Status} from "../../../components/portal-shell";

export default function Page(){
 return <PortalShell role="unternehmen" title="Bedarfe verwalten" intro="Erstellen, prüfen, veröffentlichen und archivieren Sie Ihre geschäftlichen Anforderungen zentral." action={<button className="portalPrimary">＋ Neuen Bedarf erstellen</button>}><NeedsWorkspace/><section className="lifecycle"><article><Status tone="gray">Entwurf</Status><h3>Ausführlich erfassen</h3><p>Unternehmenskontext, Ziele, Muss-Kriterien, Keywords und Projektbedingungen.</p></article><article><Status tone="blue">Prüfung</Status><h3>Qualität absichern</h3><p>Vollständigkeit, Anonymisierung und Matchingrelevanz werden geprüft.</p></article><article><Status tone="teal">Aktiv</Status><h3>Matches erhalten</h3><p>Das System sucht wiederkehrend nach passenden, geprüften Dienstleistern.</p></article><article><Status tone="amber">Archiv</Status><h3>Nachvollziehbar beenden</h3><p>Pausieren, reaktivieren, duplizieren oder dokumentiert archivieren.</p></article></section></PortalShell>;
}
