import {PortalShell} from "../../../components/portal-shell";
import {ProviderWorkspace} from "../../../components/provider-workspace";

export default function AdminProviderPreviewPage(){
 return <PortalShell role="dienstleister" title="Dienstleister-Testansicht" intro="Prüfen Sie den Dienstleisterbereich aus Sicht eines freigegebenen Anbieters.">
  <ProviderWorkspace preview/>
 </PortalShell>;
}
