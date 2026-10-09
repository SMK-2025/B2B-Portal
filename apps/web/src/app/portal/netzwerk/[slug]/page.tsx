import {NetworkShell} from "../../../components/network-shell";
import {NetworkDashboardWorkspace} from "../../../components/network-dashboard-workspace";
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const name=slug.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");return <NetworkShell slug={slug} networkName={name} title={`Willkommen bei ${name}.`} intro="Ihr zentraler Ort für Kontakte, Neuigkeiten, Veranstaltungen und die Zusammenarbeit im Partnernetzwerk."><NetworkDashboardWorkspace slug={slug}/></NetworkShell>}
