"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export function PublicNavigation() {
  const pathname=usePathname();
  useEffect(()=>{
    const menus=Array.from(document.querySelectorAll<HTMLDetailsElement>(".v2Header .mobileMenu,.v2Header .solutionsMenu"));
    menus.forEach(menu=>menu.open=false);
    const click=(event:MouseEvent)=>menus.forEach(menu=>{if(!menu.contains(event.target as Node)||(event.target as Element).closest("a"))menu.open=false;});
    const escape=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;menus.forEach(menu=>{if(menu.open){menu.open=false;menu.querySelector<HTMLElement>("summary")?.focus();}});};
    document.addEventListener("click",click);document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("click",click);document.removeEventListener("keydown",escape);};
  },[pathname]);
  return null;
}
