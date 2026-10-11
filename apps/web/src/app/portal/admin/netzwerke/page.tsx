import { AdminNetworkWorkspace } from "../../../components/admin-network-workspace";
import { PortalShell } from "../../../components/portal-shell";

export default function AdminNetworksPage() {
  return (
    <PortalShell
      role="admin"
      title="Partnerportale verwalten"
      intro="Legen Sie strikt getrennte Netzwerkmandanten an, bestimmen Sie Initiatoren und steuern Sie Zugänge, Module sowie Laufzeiten zentral."
    >
      <AdminNetworkWorkspace />
    </PortalShell>
  );
}
