import { AdminNetworkWorkspace } from "../../../components/admin-network-workspace";
import { PortalShell } from "../../../components/portal-shell";

export default function AdminNetworksPage() {
  return (
    <PortalShell
      role="admin"
      title="Netzwerkpartner verwalten"
      intro="Legen Sie Netzwerkmandanten an, steuern Sie Test- und Dauerzugänge und vergeben Sie die verantwortliche Netzwerkrolle."
    >
      <AdminNetworkWorkspace />
    </PortalShell>
  );
}
