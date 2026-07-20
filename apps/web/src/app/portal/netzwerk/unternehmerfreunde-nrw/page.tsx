import { NetworkShell } from "../../../components/network-shell";
import { NetworkDashboardWorkspace } from "../../../components/network-dashboard-workspace";

export default function Page() {
  return (
    <NetworkShell
      title="Willkommen im Netzwerkbereich."
      intro="Steuern Sie Mitglieder, Treffen und Zusammenarbeit in Ihrem geschlossenen Unternehmernetzwerk."
    >
      <NetworkDashboardWorkspace />
    </NetworkShell>
  );
}
