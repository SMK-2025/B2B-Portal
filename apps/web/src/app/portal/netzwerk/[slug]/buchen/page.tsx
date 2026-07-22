import {NetworkShell} from "../../../../components/network-shell";
import {NetworkBookingWorkspace} from "../../../../components/network-booking-workspace";

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  return <NetworkShell slug={slug} title="Netzwerkportal verbindlich buchen" intro="Prüfen Sie Leistung, Abrechnung und Vertragsdaten, bevor Sie Ihre zahlungspflichtige Bestellung absenden."><NetworkBookingWorkspace slug={slug}/></NetworkShell>;
}
