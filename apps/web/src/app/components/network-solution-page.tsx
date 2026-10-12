import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { targetAudiences } from "./public-site-data";
import { solutionStories } from "./solution-stories";

export type SolutionContent={
  eyebrow:string;
  title:string;
  lead:string;
  problem:string;
  benefits:Array<[string,string]>;
  useCases:string[];
  questions:Array<[string,string]>;
  outcome?:string;
};

export function solutionMetadata(title:string,description:string,canonical:string):Metadata {
  return {title,description,alternates:{canonical},openGraph:{title,description,type:"website",url:canonical}};
}

export function NetworkSolutionPage({content}:{content:SolutionContent}) {
  const schema={"@context":"https://schema.org","@type":"WebPage",name:content.title,description:content.lead,about:{"@type":"SoftwareApplication",name:"B2B Matching Partnerportal",applicationCategory:"BusinessApplication"},mainEntity:{"@type":"FAQPage",mainEntity:content.questions.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))}};
  const tone=content.eyebrow.includes("WIRTSCHAFTS-")?"economy":content.eyebrow.includes("VERBÄNDE")?"associations":content.eyebrow.includes("SPORT")?"sport":content.eyebrow.includes("FRANCHISE")?"franchise":content.eyebrow.includes("STANDORT")?"location":content.eyebrow.includes("BUSINESS")?"club":"ecosystem";
  return <main className={`v2 publicSite solutionPage solutionTone-${tone}`}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><SiteHeader/>
    <section className="subHero solutionHero"><div><span>{content.eyebrow}</span><h1>{content.title}</h1><p>{content.lead}</p><div><a className="v2Button" href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen">Partnerportal anfragen →</a><Link className="v2Button outline" href={'/funktionen' as never}>Funktionen ansehen</Link></div></div><aside aria-hidden="true"><b>Ihr Netzwerk</b><span>Mitglieder</span><span>Kommunikation</span><span>Veranstaltungen</span><span>Zusammenarbeit</span></aside></section>
    <nav className="audienceBreadcrumb" aria-label="Lösungsnavigation"><Link href={'/loesungen' as never}>Alle Zielgruppen</Link><span>›</span><strong>{content.eyebrow.replace("FÜR ","")}</strong></nav>
    <section className="contentLead"><span>WARUM EIN EIGENES PARTNERPORTAL?</span><h2>{content.problem}</h2><p>{solutionStories[tone].intro}</p></section>
    <section className="valueGrid">{content.benefits.map(([title,text],index)=><article key={title}><b>0{index+1}</b><h3>{title}</h3><p>{text}</p></article>)}</section>
    <section className="solutionStories"><div className="v2Heading"><span>SO ENTSTEHT MEHRWERT IM ALLTAG</span><h2>{solutionStories[tone].heading}</h2></div><div>{solutionStories[tone].chapters.map(([title,text],index)=><article key={title}><span>0{index+1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section className="solutionOutcome"><span>DAS GEMEINSAME ZIEL</span><h2>{content.outcome || solutionStories[tone].heading}</h2><p>{solutionStories[tone].outcome}</p></section>
    <section className="darkStatement"><span>TYPISCHE ANWENDUNGEN</span><h2>Ein Portal für den Alltag Ihres Netzwerks.</h2><div>{content.useCases.map(item=><article key={item}><b>✓</b><p>{item}</p></article>)}</div></section>
    <section className="v2Faq"><div className="v2Heading"><span>ENTSCHEIDUNGSFRAGEN</span><h2>Was Verantwortliche<br/><em>wissen möchten.</em></h2></div><div>{content.questions.map(([q,a],i)=><details key={q} open={i===0}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
    <section className="relatedAudiences"><span>WEITERE NETZWERKFORMEN</span><h2>Andere Organisation, dasselbe Ziel: Menschen wirksam verbinden.</h2><div>{targetAudiences.slice(0,3).map(item=><Link key={item.href} href={item.href as never}><b>{item.mark}</b><span>{item.label}</span>→</Link>)}</div></section>
    <section className="v2Cta"><span>PERSÖNLICH EINGERICHTET</span><h2>Ihr Netzwerk verdient einen eigenen digitalen Ort.</h2><p>Wir richten das Partnerportal passend zu Ihrer Organisation ein und übergeben die Verwaltung an Ihren Initiator.</p><a className="v2Button light" href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen">Unverbindlich anfragen →</a></section><SiteFooter/>
  </main>;
}
