import {AdminProviderSnapshot} from "../../../components/admin-provider-snapshot";
import {PortalShell} from "../../../components/portal-shell";

export default function AdminProviderPreviewPage(){
  return <PortalShell role="admin" title="Dienstleisterkonten prüfen" intro="Prüfen Sie ausschließlich tatsächlich registrierte Dienstleister, Leistungsseiten und freigegebene Geschäftschancen.">
    <AdminProviderSnapshot/>
  </PortalShell>;
}
