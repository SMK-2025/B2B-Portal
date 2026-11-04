import { PortalShell } from "../../../components/portal-shell";
import { MailingsWorkspace } from "../../../components/mailings-workspace";
export default function MailingsPage() {
  return (
    <PortalShell
      role="admin"
      title="Mailings & Leads"
      intro="Neue Kontakte gewinnen. Netzwerkbezogen planen, persönlich ansprechen und Ergebnisse nachvollziehen."
    >
      <MailingsWorkspace />
    </PortalShell>
  );
}
