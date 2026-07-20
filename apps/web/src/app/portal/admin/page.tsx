import {AdminReviewWorkspace} from "../../components/admin-review-workspace";
import {PortalShell} from "../../components/portal-shell";

export default function AdminPortal(){
 return <PortalShell role="admin" title="Prüfzentrum und Portalsteuerung" intro="Hier sehen und entscheiden Sie alle zentral eingereichten Unternehmensprofile und Bedarfsmitteilungen."><AdminReviewWorkspace/></PortalShell>;
}
