"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const cards = ".publicSite :is(.audienceGrid>a,.solutionOverview>div>a,.valueGrid>article,.promiseSteps>article,.capabilitySection>div>article,.introductionPath li,.v2Trust article,.functionPrinciples article,.moduleCatalogue article,.publicSecurityGrid article,.howGrid article,.solutionStories article,.relatedAudiences a,.darkStatement>div>article)";

// Original line illustrations: one visual vocabulary for every public card.
function Artwork({ title }: { title: string }) {
  let motif;
  if (/sichtbar|kennenlernen|entdecken/i.test(title)) motif = <><path d="M5 32s10-16 27-16 27 16 27 16-10 16-27 16S5 32 5 32Z"/><circle cx="32" cy="32" r="8"/></>;
  else if (/begegnung/i.test(title)) motif = <><circle cx="18" cy="18" r="7"/><circle cx="46" cy="18" r="7"/><path d="M6 49V39c0-8 5-12 12-12s12 4 12 12v10M34 49V39c0-8 5-12 12-12s12 4 12 12v10M26 19h12M33 14l5 5-5 5"/></>;
  else if (/vertrauen/i.test(title)) motif = <><path d="M32 53S8 38 8 22c0-15 18-19 24-6 6-13 24-9 24 6 0 16-24 31-24 31Z"/><path d="m23 29 6 6 13-13"/></>;
  else if (/wirkung|wert|skalieren/i.test(title)) motif = <><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="4"/><path d="m36 28 18-18M46 10h8v8"/></>;
  else if (/aufgabe|projekt|vorhaben/i.test(title)) motif = <><rect x="13" y="10" width="38" height="47" rx="5"/><path d="m20 25 3 3 6-7M34 25h10M20 39l3 3 6-7M34 39h10M23 10V6h18v4"/></>;
  else if (/leistung|angebot|kompetenz/i.test(title)) motif = <><path d="M8 19h48v36H8ZM23 19v-9h18v9M8 33h48M28 30h8v7h-8Z"/></>;
  else if (/teilnahme|einladung|zugang/i.test(title)) motif = <><rect x="8" y="12" width="48" height="40" rx="5"/><path d="m8 15 24 19 24-19M10 49l15-17M54 49 39 32"/><circle cx="48" cy="48" r="10"/><path d="m43 48 3 3 6-7"/></>;
  else if (/zusammenarbeit|kooperation|gemeinsam handeln/i.test(title)) motif = <><path d="m6 23 12-10 14 7 12-7 14 10-8 22-12 7-8-4-8 3-11-9ZM21 23l10 8 12-10M21 38l17 14M29 34l18 13M38 30l14 11"/></>;
  else if (/sport|sponsor/i.test(title)) motif = <><path d="M18 12h28v12c0 13-7 20-14 20s-14-7-14-20Z M18 16H9v8c0 7 5 11 12 11M46 16h9v8c0 7-5 11-12 11M32 44v10M23 55h18"/><path d="m32 19 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/></>;
  else if (/veranstalt|treffen|kalender/i.test(title)) motif = <><rect x="10" y="14" width="44" height="42" rx="7"/><path d="M10 26h44M22 8v13M42 8v13M21 35h7M36 35h7M21 45h7M36 45h7"/></>;
  else if (/nachricht|kommunik|austausch|gespräch|community/i.test(title)) motif = <><path d="M9 10h37v27H23L9 46ZM28 43h13l13 10V25h-5"/><path d="M18 20h19M18 28h13"/></>;
  else if (/dokument|wissen|information/i.test(title)) motif = <><path d="M15 8h24l11 11v37H15ZM39 8v13h11M24 30h17M24 38h17M24 46h11"/></>;
  else if (/sicher|geschütz|marke|brand/i.test(title)) motif = <><path d="m32 7 21 9v16c0 12-9 20-21 25-12-5-21-13-21-25V16ZM22 31l7 7 15-16"/></>;
  else if (/standort|region/i.test(title)) motif = <><path d="M49 25c0 13-17 31-17 31S15 38 15 25a17 17 0 0 1 34 0Z"/><circle cx="32" cy="25" r="7"/></>;
  else if (/franchise|verbund/i.test(title)) motif = <><rect x="23" y="6" width="18" height="17" rx="3"/><rect x="5" y="40" width="18" height="17" rx="3"/><rect x="41" y="40" width="18" height="17" rx="3"/><path d="M32 23v9H14v8M32 32h18v8M29 13h6M11 47h6M47 47h6"/></>;
  else if (/verbände|interessen/i.test(title)) motif = <><circle cx="32" cy="32" r="11"/><circle cx="32" cy="9" r="4"/><circle cx="55" cy="32" r="4"/><circle cx="32" cy="55" r="4"/><circle cx="9" cy="32" r="4"/><path d="M32 13v8M43 32h8M32 43v8M13 32h8M20 12l-8 8M44 12l8 8M12 44l8 8M44 52l8-8"/></>;
  else if (/club|empfehl/i.test(title)) motif = <><path d="m7 28 10-13 12 6 7-3 21 14-12 19-11-5-8 5-19-16ZM19 25l12 8 8-7M26 40l8 6M38 37l7 5"/></>;
  else if (/ökosystem|partnerprogramm/i.test(title)) motif = <><circle cx="32" cy="32" r="9"/><circle cx="10" cy="12" r="5"/><circle cx="54" cy="12" r="5"/><circle cx="10" cy="52" r="5"/><circle cx="54" cy="52" r="5"/><path d="m14 16 11 10M39 26l11-10M14 48l11-10M39 38l11 10"/></>;
  else if (/umsatz|auswert|nutzen|geschäft/i.test(title)) motif = <><path d="M10 54h45M17 47V34M30 47V25M43 47V15M13 26l15-13 12 4L54 7M45 7h9v9"/></>;
  else if (/netzwerk|partner|mitglied/i.test(title)) motif = <><circle cx="32" cy="16" r="7"/><circle cx="14" cy="43" r="7"/><circle cx="50" cy="43" r="7"/><path d="M28 23 18 36M36 23l10 13M21 43h22"/></>;
  else return null;
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{motif}</svg>;
}

export function PublicCardArtwork() {
  const pathname = usePathname();
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(cards));
    setTargets(elements);
    const cleanups = elements.map(element => {
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const bounds = element.getBoundingClientRect();
        element.style.setProperty("--art-x", `${((event.clientX-bounds.left)/bounds.width-.5)*18}px`);
        element.style.setProperty("--art-y", `${((event.clientY-bounds.top)/bounds.height-.5)*18}px`);
      };
      const reset = () => { element.style.removeProperty("--art-x"); element.style.removeProperty("--art-y"); };
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerleave", reset);
      return () => { element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", reset); reset(); };
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [pathname]);
  const seen = new Map<Element, Set<string>>();
  return <>{targets.map((element, index) => {
    const title = element.querySelector("h3")?.textContent || "Partner";
    const artwork = Artwork({title});
    const group = element.parentElement!;
    // React development elements may contain circular owner references.
    const signature = artwork ? JSON.stringify(artwork.props.children, (key,value)=>key.startsWith("_") ? undefined : value) : "";
    const used = seen.get(group) || new Set<string>();
    const decorate = !!artwork && !used.has(signature);
    used.add(signature); seen.set(group, used);
    const badge = element.matches(".audienceGrid>a,.solutionOverview>div>a") ? element.querySelector("b") : null;
    return <span key={`${pathname}-${index}`}>{decorate && createPortal(<div className="publicCardArtwork" aria-hidden="true">{artwork}</div>, element)}{badge && createPortal(<span className="publicCardBadgeIcon">{artwork}</span>, badge)}</span>;
  })}</>;
}
