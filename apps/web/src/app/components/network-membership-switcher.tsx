"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {getPortalSession,portalRequest} from "../lib/portal-api";
export function NetworkMembershipSwitcher({slug}:{slug:string}) {
  const router=useRouter(),[networks,setNetworks]=useState<Array<{network:{slug:string;name:string}}>>([]);
  useEffect(()=>{const token=getPortalSession();if(token)void portalRequest<typeof networks>("/networks/mine",{token}).then(setNetworks).catch(()=>{});},[slug]);
  if(networks.length<2)return null;
  return <label style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",padding:"10px 20px",fontSize:"0.875rem",background:"#fff",borderBottom:"1px solid #e4e8ef"}}>Ihr Netzwerk<select aria-label="Netzwerk wechseln" value={slug} onChange={e=>router.push(`/portal/netzwerk/${e.target.value}` as never)} style={{maxWidth:"100%",width:360,fontSize:"0.875rem"}}>{networks.map(n=><option key={n.network.slug} value={n.network.slug}>{n.network.name}</option>)}</select></label>;
}
