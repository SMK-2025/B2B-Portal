import type { Metadata } from "next";
import Link from "next/link";
import { activeCityNetworks } from "../lib/active-city-networks";
import { SiteHeader, SiteFooter } from "../components/site-chrome";
export const dynamic = "force-dynamic";
export const metadata:Metadata={title:"Unternehmernetzwerke in Deutschland | Ihre Stadt finden",description:"Finden Sie Ihr lokales Unternehmernetzwerk: eigenständige Mitgliederbereiche, direkte Kontakte und Leistungen vor Ort. Stadtnetzwerk auswählen und Mitgliedschaft anfragen.",alternates:{canonical:"/netzwerke"}};
export default async function Page(){
  const cities = await activeCityNetworks();
  const base=process.env.NEXT_PUBLIC_SITE_URL || "https://b2b-matching.de";
  const schema={"@context":"https://schema.org","@type":"ItemList",name:"Stadtnetzwerke von B2B Matching",numberOfItems:cities.length,itemListElement:cities.map((city,index)=>({"@type":"ListItem",position:index+1,name:`Unternehmernetzwerk ${city.city}`,url:base+city.route}))};
  return <main className="v2 publicSite"><SiteHeader/><section className="section" style={{maxWidth:1100,margin:"60px auto",padding:"0 24px"}}><h1>Ihr Unternehmernetzwerk.<br/>In Ihrer Stadt.</h1><p>Unternehmen kennenlernen, Leistungen entdecken und direkt ins Gespräch kommen. Jedes Stadtnetzwerk hat seinen eigenen geschützten Mitgliederbereich. Die neuen Standorte befinden sich im Aufbau; Mitglieder und Inhalte wachsen mit den teilnehmenden Unternehmen.</p><p>Unabhängiges Angebot von B2B Matching. Keine Angebote der jeweiligen Stadtverwaltung.</p>{cities.length ? <ul style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",listStyle:"none",padding:0,gap:"0 28px"}}>{cities.map(city=><li key={city.slug} style={{borderBottom:"1px solid #dce2e7",padding:"20px 0"}}><Link href={city.route as never}><strong>Unternehmernetzwerk {city.city}</strong><br/><small>{city.region} · Netzwerk kennenlernen ↗</small></Link></li>)}</ul> : <p>Die Übersicht ist momentan nicht verfügbar. <Link href="/Koeln">Zum Unternehmernetzwerk Köln</Link> oder <Link href="/Leverkusen">Leverkusen</Link>.</p>}</section><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/><SiteFooter formal/></main>;
}
