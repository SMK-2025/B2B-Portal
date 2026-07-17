import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./site-chrome";
export function LegalPage({ eyebrow, title, intro, children, updated="17. Juli 2026" }:{eyebrow:string;title:string;intro:string;children:ReactNode;updated?:string}) {
  return <main className="v2"><SiteHeader/><header className="legalHero"><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p><small>Stand: {updated}</small></header><div className="legalLayout"><aside aria-label="Hinweis"><strong>Verständlich und transparent</strong><p>Diese Informationen gelten für die geschäftliche Nutzung von B2B Matching.</p><a href="mailto:mail@media-online-innovations.group">Fragen per E-Mail</a></aside><article className="legalContent">{children}</article></div><SiteFooter/></main>;
}
export function LegalSection({ title, children }:{title:string;children:ReactNode}) { return <section><h2>{title}</h2>{children}</section>; }
