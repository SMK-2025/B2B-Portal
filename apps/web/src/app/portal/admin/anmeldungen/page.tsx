import { PortalShell } from "../../../components/portal-shell";
import { AdminMemberRegistrations } from "../../../components/admin-member-registrations";
export default function Page() {
  return (
    <PortalShell
      role="admin"
      title="Anmeldungen & Mitgliedsjahre"
      intro="Jahresbuchungen, individuelle Mitgliedspreise und Rechnungsdaten. Rechnungen werden manuell erstellt und versendet."
    >
      <AdminMemberRegistrations />
    </PortalShell>
  );
}
