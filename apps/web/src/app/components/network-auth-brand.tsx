"use client";
import Link from "next/link";
import {useEffect,useState,type CSSProperties,type ReactNode} from "react";
import {portalRequest} from "../lib/portal-api";

export type NetworkBrand={slug:string;name:string;logoUrl:string|null;primaryColor:string;secondaryColor:string;websiteUrl:string|null};
export function useNetworkBrand(slug:string){const[brand,setBrand]=useState<NetworkBrand|null>(null);useEffect(()=>{if(!slug)return;portalRequest<NetworkBrand>(`/networks/branding/${encodeURIComponent(slug)}`).then(setBrand).catch(()=>setBrand(null))},[slug]);return brand}
export function NetworkAuthFrame({brand,children,kind}:{brand:NetworkBrand;children:ReactNode;kind:"login"|"register"}){
 const style={"--auth-primary":brand.primaryColor,"--auth-secondary":brand.secondaryColor} as CSSProperties;
 return <main className="networkAuthPortal" style={style}><header><Link href={`/anmelden?network=${encodeURIComponent(brand.slug)}` as never}>{brand.logoUrl?<img src={brand.logoUrl} alt={`${brand.name} Logo`}/>:<span>{brand.name.slice(0,2).toUpperCase()}</span>}<div><b>{brand.name}</b><small>Geschütztes Partnerportal</small></div></Link><em>Sicherer Netzwerkzugang</em></header><section><aside><span>{kind==="login"?"WILLKOMMEN ZURÜCK":"PERSÖNLICHE EINLADUNG"}</span><h1>{kind==="login"?`Willkommen bei ${brand.name}.`:`Ihr Zugang zu ${brand.name}.`}</h1><p>{kind==="login"?"Informationen, Kontakte, Veranstaltungen und Zusammenarbeit in Ihrem geschlossenen Partnernetzwerk.":"Richten Sie Ihren persönlichen Zugang ein. Ihre Daten und Unternehmensseite bleiben ausschließlich innerhalb dieses Netzwerks sichtbar."}</p><ul><li>Geschlossener, mandantengetrennter Bereich</li><li>Zugang ausschließlich für eingeladene Partner</li><li>Branding und Inhalte durch die Netzwerkleitung</li></ul></aside><div>{children}</div></section><footer><span>© {new Date().getFullYear()} {brand.name}</span><span>Technisch bereitgestellt durch B2B Matching</span></footer></main>
}
