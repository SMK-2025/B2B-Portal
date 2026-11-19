"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_KEY, parseConsent, publicAnalyticsPath } from "../lib/analytics-consent";

declare global { interface Window { dataLayer?:unknown[];gtag?:(...args:unknown[])=>void; } }
// Container ID is set only after its isolated B2B container has been verified.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-PVD8HPJ9";
const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || "G-6CM073DSVV";
export function MarketingAnalytics() {
  const pathname=usePathname();
  const lastPage=useRef("");
  useEffect(()=>{
    const path=publicAnalyticsPath(pathname);
    if(!path || !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) {
      (window as unknown as Record<string,unknown>)[`ga-disable-${GA_ID}`]=true;
      window.gtag?.("consent","update",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
      lastPage.current="";
      return;
    }
    let active=true;
    function allowed(){try{return parseConsent(localStorage.getItem(CONSENT_KEY))?.statistics===true;}catch{return false;}}
    function sync(){
      if(!path)return;
      (window as unknown as Record<string,unknown>)[`ga-disable-${GA_ID}`]=!allowed();
      window.dataLayer ||= [];
      window.gtag ||= function(){window.dataLayer!.push(arguments);};
      if(!allowed()) {
        window.gtag("consent","update",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
        // No script is loaded before consent. Revoke cookies if consent is withdrawn.
        for(const item of document.cookie.split(";")) {
          const name=item.trim().split("=")[0];
          if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) continue;
          for(const domain of ["",location.hostname,".b2b-matching.de"])
            document.cookie=`${name}=; Max-Age=0; Path=/;${domain?` Domain=${domain};`:""} SameSite=Lax; Secure`;
        }
        lastPage.current="";return;
      }
      if(!document.getElementById("b2b-gtm")) {
        window.gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
        window.gtag("set","ads_data_redaction",true);
        window.dataLayer.push({"gtm.start":Date.now(),event:"gtm.js"});
        const script=document.createElement("script");script.id="b2b-gtm";script.async=true;
        script.src=`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;document.head.appendChild(script);
      }
      window.gtag("consent","update",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
      if(lastPage.current!==path && active){
        // Never send the browser's full URL, query strings, page titles or account data.
        window.dataLayer.push({event:"b2b_page_view",page_location:`https://b2b-matching.de${path}`,page_path:path,page_title:path==="/"?"B2B Matching":path.slice(1),ga_measurement_id:GA_ID});
        lastPage.current=path!;
      }
    }
    sync();window.addEventListener("consent-updated",sync);
    return ()=>{active=false;window.removeEventListener("consent-updated",sync);};
  },[pathname]);
  return null;
}
export function trackMembershipStart(network:string) {
  try {
    const path=publicAnalyticsPath(location.pathname);
    if(!path || !parseConsent(localStorage.getItem(CONSENT_KEY))?.statistics || !document.getElementById("b2b-gtm") || !/^unternehmernetzwerk[a-z]+$/.test(network))return;
    window.dataLayer?.push({event:"b2b_conversion",ga_event_name:"membership_start",page_location:`https://b2b-matching.de${path}`,page_path:path,page_title:path.slice(1),network_slug:network});
  }catch{}
}
