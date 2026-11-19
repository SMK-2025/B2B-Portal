import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {CityMarketing} from "./city-marketing";
import {MarketingInfoPage} from "./marketing-info-page";
import {CITY_NETWORKS} from "../lib/city-networks";
import {MARKETING_PAGES,type MarketingPageKey} from "../lib/marketing-pages";
import {activeCityNetworks} from "../lib/active-city-networks";
import type {CityMembershipOffer} from "./leverkusen-offer";
import photos from "../lib/city-photos.json";

const base="https://b2b-matching.de";
export function publishedMetadata(key?:string):Metadata {
  const city=CITY_NETWORKS.find(c=>c.key===key),page=key&&Object.hasOwn(MARKETING_PAGES,key)?MARKETING_PAGES[key as MarketingPageKey]:null;
  const path=city?.route || (key?`/${key}`:"/");
  const title=city?`Unternehmernetzwerk ${city.city} – Kontakte & Kooperationen`:page?`${page.label} – B2B Matching`:"Unternehmernetzwerk online – Kontakte vor Ort | B2B Matching";
  const description=city?`Im Unternehmernetzwerk ${city.city} in ${city.region} Unternehmen kennenlernen, Geschäftskontakte knüpfen, Leistungen finden und im Mitglieder-Chat sprechen. Mitglied werden ab 9,90 € netto monatlich.`:page?.description || "Ihr Unternehmernetzwerk vor Ort: Unternehmen entdecken, Geschäftskontakte knüpfen und online ins Gespräch kommen. 50 Stadtnetzwerke und eigene White-Label-Portale.";
  const image=city?photos.find(p=>p.key===city.key)?.small:"/markenbild";
  return {title:{absolute:title},description,alternates:{canonical:path},robots:{index:true,follow:true},openGraph:{title,description,url:path,type:"website",siteName:"B2B Matching",locale:"de_DE",images:image?[{url:image,alt:city?`Unternehmernetzwerk ${city.city}`:"B2B Matching"}]:undefined},twitter:{card:"summary_large_image",title,description,images:image?[image]:undefined}};
}
export async function PublishedMarketing({cityKey,page}:{cityKey?:string;page?:MarketingPageKey}) {
  const city=cityKey?CITY_NETWORKS.find(c=>c.key===cityKey):null;
  if(cityKey&&(!city || !(await activeCityNetworks()).some(c=>c.key===cityKey)))notFound();
  let offer:CityMembershipOffer|null=null;
  if(city){try{const api=process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/,"");if(api){const response=await fetch(`${api}/api/networks/participation/quote/${city.slug}`,{cache:"no-store",signal:AbortSignal.timeout(10000)});if(response.ok)offer=await response.json();}}catch{}}
  const path=city?.route || (page?`/${page}`:"/");
  const name=city?`Unternehmernetzwerk ${city.city}`:page?MARKETING_PAGES[page].label:"B2B Matching";
  const schema={"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":`${base}/#organization`,name:"B2B Matching",legalName:"Media Online Innovations Group, Inhaber Martin Kelm",url:base,logo:`${base}/images/b2b-matching-logo-full.png`,email:"service@b2b-matching.de",address:{"@type":"PostalAddress",streetAddress:"Im Weidenblech 25",postalCode:"51371",addressLocality:"Leverkusen",addressCountry:"DE"}},{"@type":"WebSite","@id":`${base}/#website`,url:base,name:"B2B Matching",inLanguage:"de-DE",publisher:{"@id":`${base}/#organization`}},{"@type":"WebPage","@id":`${base}${path}#page`,url:`${base}${path}`,name,isPartOf:{"@id":`${base}/#website`},inLanguage:"de-DE",...(city?{about:{"@type":"Place",name:city.city,address:{"@type":"PostalAddress",addressLocality:city.city,addressRegion:city.region,addressCountry:"DE"}}}:{})},...(path!=="/"?[{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Startseite",item:base},{"@type":"ListItem",position:2,name,item:`${base}${path}`}]}]:[])]};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>{page?<MarketingInfoPage page={page} preview={false}/>:<CityMarketing cityKey={cityKey} offer={offer} preview={false}/>}</>;
}
