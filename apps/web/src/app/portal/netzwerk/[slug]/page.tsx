import {NetworkShell} from "../../../components/network-shell";
import {NetworkDashboardWorkspace} from "../../../components/network-dashboard-workspace";
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const name=slug.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");return <NetworkShell slug={slug} networkName={name} title="Willkommen in Ihrem Netzwerk." intro="Erkunden Sie Mitgliederverwaltung, Zusammenarbeit und alle geplanten Netzwerkfunktionen."><NetworkDashboardWorkspace slug={slug}/></NetworkShell>}
