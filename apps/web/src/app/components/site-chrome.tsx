import Link from "next/link";
import { CookieSettingsButton } from "./cookie-consent";
import { HomeMotion } from "./home-motion";
import { targetAudiences } from "./public-site-data";

export function Logo() {
  return <Link className="v2Logo" href="/" aria-label="B2B Matching Startseite"><span className="brandSymbol" aria-hidden="true"/><span className="brandWordmark"><b>B2B</b><span>Matching</span></span></Link>;
}

export function SiteHeader() {
  return <><HomeMotion/><header className="v2Header"><Logo/><nav aria-label="Hauptnavigation"><details className="solutionsMenu"><summary>Lösungen</summary><div>{targetAudiences.map(item=><Link key={item.href} href={item.href as never}><b>{item.label}</b><small>{item.short}</small></Link>)}<Link className="allSolutions" href={'/loesungen' as never}>Alle Zielgruppen ansehen →</Link></div></details><Link href={'/funktionen' as never}>Funktionen</Link><Link href={'/so-funktionierts' as never}>Einführung</Link><Link href={'/sicherheit' as never}>Sicherheit</Link></nav><div className="desktopActions"><Link className="v2Login" href="/anmelden">Partnerportal anmelden</Link><a className="v2Button small" href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen">Portal anfragen</a></div><details className="mobileMenu"><summary aria-label="Menü öffnen"><span/><span/><span/></summary><div><Link href={'/loesungen' as never}>Lösungen für Netzwerke</Link>{targetAudiences.map(item=><Link key={item.href} href={item.href as never}>{item.label}</Link>)}<Link href={'/funktionen' as never}>Funktionen</Link><Link href={'/so-funktionierts' as never}>Einführung</Link><Link href={'/sicherheit' as never}>Sicherheit</Link><hr/><Link href="/anmelden">Partnerportal anmelden</Link><a className="v2Button" href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen">Portal anfragen</a></div></details></header></>;
}

export function SiteFooter() {
  return <footer className="v2Footer"><div className="v2FooterTop"><div><Logo/><p>Das Partnerportal für Netzwerke, die aus Mitgliedern eine aktive Gemeinschaft und aus Kontakten echte Zusammenarbeit machen.</p></div><div><b>Zielgruppen</b>{targetAudiences.slice(0,4).map(item=><Link key={item.href} href={item.href as never}>{item.label}</Link>)}</div><div><b>Weitere Lösungen</b>{targetAudiences.slice(4).map(item=><Link key={item.href} href={item.href as never}>{item.label}</Link>)}</div><div><b>Partnerportal</b><Link href={'/funktionen' as never}>Funktionen</Link><Link href={'/so-funktionierts' as never}>Einführung</Link><Link href={'/sicherheit' as never}>Sicherheit</Link><Link href="/barrierefreiheit">Barrierefreiheit</Link></div><div><b>Zugang</b><Link href="/anmelden">Anmelden</Link><a href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen">Portal anfragen</a></div><div><b>Rechtliches</b><Link href="/impressum">Impressum</Link><Link href="/agb">AGB</Link><Link href="/datenschutz/unternehmen">Datenschutz</Link><Link href="/cookies">Cookies</Link><CookieSettingsButton/></div></div><div className="v2FooterBottom"><span>© 2026 B2B Matching</span><span>Das Netzwerk für Netzwerke.</span></div></footer>;
}

export function PageHero({eyebrow,title,lead,action}:{eyebrow:string;title:string;lead:string;action:string;secondary?:string}) {
  return <section className="subHero"><div><span>{eyebrow}</span><h1>{title}</h1><p>{lead}</p><div><a className="v2Button" href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen">{action} →</a></div></div></section>;
}

export function CTA({title,text}:{title:string;text:string;role:string}) {
  return <section className="v2Cta"><span>PARTNERPORTAL ANFRAGEN</span><h2>{title}</h2><p>{text}</p><a className="v2Button light" href="mailto:service@b2b-matching.de?subject=Partnerportal%20anfragen">Unverbindlich anfragen →</a></section>;
}
