import { PortalShell } from "../../components/portal-shell";
import { AccountSettingsWorkspace } from "../../components/account-settings-workspace";
export default function AccountPage() {
  return (
    <PortalShell
      role="admin"
      title="Mein Konto & Sicherheit"
      intro="Persönliche Login-Adresse und Passwort sicher verwalten."
    >
      <AccountSettingsWorkspace />
    </PortalShell>
  );
}
