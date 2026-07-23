"use client";

import { useEffect } from "react";

export function HomeMotion(){
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>("main.v2");
    if(!root)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("homeMotionReady");
    const move=(event:PointerEvent)=>{root.style.setProperty("--mouse-x",`${event.clientX}px`);root.style.setProperty("--mouse-y",`${event.clientY}px`)};
    if(!reduced)window.addEventListener("pointermove",move,{passive:true});
    const elements=[...root.querySelectorAll<HTMLElement>("main.v2 > section:not(.v2Hero):not(.subHero):not(.networkPublicHero):not(.authPage), .v2Clarity article, .roleCards article, .processGrid article, .v2Trust article, .painGrid article, .valueGrid article, .securityGrid article, .journey > article, .networkRoleFlow article, .networkFeatureGrid article, .networkPriceColumns article, .authTrust > div, .authAfter article, .splitContent > div")];
    elements.forEach((element,index)=>{element.classList.add("homeReveal");element.style.setProperty("--reveal-delay",`${Math.min(index%4,3)*70}ms`)});
    if(reduced){elements.forEach(element=>element.classList.add("isVisible"));return()=>root.classList.remove("homeMotionReady")}
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("isVisible");observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:"0px 0px -7% 0px"});
    elements.forEach(element=>observer.observe(element));
    return()=>{observer.disconnect();window.removeEventListener("pointermove",move);root.classList.remove("homeMotionReady")};
  },[]);
  return null;
}
