import {CompanyProfileOverview} from "../../../components/company-profile-overview";
import {PortalShell} from "../../../components/portal-shell";

export default function Page(){
 return <PortalShell role="unternehmen" title="Unternehmensprofil" intro="Verwalten Sie Stammdaten, Ansprechpartner, Berechtigungen und den matchingrelevanten Unternehmenskontext." action={<button className="portalPrimary">Unternehmensprofil bearbeiten</button>}><CompanyProfileOverview/></PortalShell>;
}
