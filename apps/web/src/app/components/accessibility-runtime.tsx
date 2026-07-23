"use client";

import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";

const focusableSelector=[
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "summary",
].join(",");

export function AccessibilityRuntime(){
 const pathname=usePathname();
 const [announcement,setAnnouncement]=useState("");
 const lastTrigger=useRef<HTMLElement|null>(null);

 useEffect(()=>{
  const timer=window.setTimeout(()=>setAnnouncement(`Seite geladen: ${document.title}`),50);
  return()=>window.clearTimeout(timer);
 },[pathname]);

 useEffect(()=>{
  let activeDialog:HTMLElement|null=null;
  const focusDialog=(dialog:HTMLElement)=>{
   if(activeDialog===dialog)return;
   activeDialog=dialog;
   lastTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
   const heading=dialog.querySelector<HTMLElement>("h1,h2,h3");
   if(heading&&!heading.id)heading.id=`dialog-title-${Date.now()}`;
   if(heading&&!dialog.getAttribute("aria-labelledby"))dialog.setAttribute("aria-labelledby",heading.id);
   const first=dialog.querySelector<HTMLElement>(focusableSelector);
   if(first)first.focus();else{dialog.tabIndex=-1;dialog.focus()}
  };
  const findDialog=()=>document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]');
  const observer=new MutationObserver(()=>{
   const dialog=findDialog();
   if(dialog)focusDialog(dialog);
   else if(activeDialog){
    activeDialog=null;
    lastTrigger.current?.focus();
    lastTrigger.current=null;
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  const initial=findDialog();if(initial)focusDialog(initial);
  const onKeyDown=(event:KeyboardEvent)=>{
   const dialog=findDialog();if(!dialog)return;
   if(event.key==="Escape"){
    const close=dialog.querySelector<HTMLButtonElement>('button[aria-label*="Schließ"],button[aria-label*="schließ"]');
    if(close){event.preventDefault();close.click()}
    return;
   }
   if(event.key!=="Tab")return;
   const items=[...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(item=>item.offsetParent!==null);
   if(!items.length){event.preventDefault();dialog.focus();return}
   const first=items[0],last=items[items.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  };
  document.addEventListener("keydown",onKeyDown);
  return()=>{observer.disconnect();document.removeEventListener("keydown",onKeyDown)};
 },[]);

 return <div className="srOnly" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>;
}
