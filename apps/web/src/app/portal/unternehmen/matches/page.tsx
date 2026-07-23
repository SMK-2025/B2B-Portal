import {PortalShell} from "../../../components/portal-shell";
import {BuyerMatchWorkspace} from "../../../components/buyer-match-workspace";

export default function Page(){
 return <PortalShell role="unternehmen" title="Matching-Zentrale" intro="Prüfen Sie Empfehlungen, vergleichen Sie Passungen und entscheiden Sie kontrolliert über jede Freigabe."><BuyerMatchWorkspace/></PortalShell>;
}
