import { PortalShell } from "../../components/portal-shell";
import { AccountSettingsWorkspace } from "../../components/account-settings-workspace";
export default function AccountPage() {
  return (
    <PortalShell
      role="admin"
      title="Mein Konto & Sicherheit"
      intro="Dein Zugang, deine Mitgliedschaften und Rechnungen – übersichtlich an einem Ort."
    >
      <AccountSettingsWorkspace />
    </PortalShell>
  );
}
