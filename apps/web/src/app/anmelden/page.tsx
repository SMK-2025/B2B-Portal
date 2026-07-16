import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../components/site-chrome";
export const metadata: Metadata = { title: "Anmelden" };
export default function Anmelden(){return <main className="authShell"><div className="authBrand"><Logo/></div><section className="authCard"><p className="sectionKicker">WILLKOMMEN ZURÜCK</p><h1>Bei B2B Matching anmelden</h1><p className="lead">Greifen Sie auf Profile, Bedarfe, Matches und Gespräche zu.</p><form className="formGrid"><label className="full">E-Mail-Adresse<input type="email" name="email" autoComplete="email" placeholder="name@unternehmen.de"/></label><label className="full">Passwort<input type="password" name="password" autoComplete="current-password" placeholder="••••••••"/></label><button className="primary full" type="button">Anmelden</button></form><p className="authHint">Noch kein Profil? <Link href="/registrieren">Kostenlos registrieren</Link></p></section></main>}
