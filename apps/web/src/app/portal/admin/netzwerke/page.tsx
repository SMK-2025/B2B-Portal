import { AdminNetworkWorkspace } from "../../../components/admin-network-workspace";
import { PortalShell } from "../../../components/portal-shell";

export default function AdminNetworksPage() {
  return (
    <PortalShell
      role="admin"
      title="Partnerportale verwalten"
      intro="Legen Sie getrennte Partnernetzwerke an, bestimmen Sie kostenlose Initiatoren und legen Sie den individuellen Mitgliedspreis je Netzwerk fest."
    >
      <AdminNetworkWorkspace />
    </PortalShell>
  );
}
