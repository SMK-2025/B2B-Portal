import { PortalShell } from "../../../components/portal-shell";
import { AdminMemberRegistrations } from "../../../components/admin-member-registrations";
import { OperatorMailStatus } from "../../../components/operator-mail-status";
export default function Page() {
  return (
    <PortalShell
      role="admin"
      title="Anmeldungen & Mitgliedsjahre"
      intro="Jahresbuchungen, individuelle Mitgliedspreise und Rechnungsdaten. Rechnungen werden manuell erstellt und versendet."
    >
      <div style={{ display: "grid", gap: 24 }}>
        <OperatorMailStatus />
        <AdminMemberRegistrations />
      </div>
    </PortalShell>
  );
}
