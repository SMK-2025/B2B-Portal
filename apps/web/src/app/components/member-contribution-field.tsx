"use client";
import {useId} from "react";
import {parseMonthlyContribution} from "../lib/member-contribution";
import "./member-contribution-field.css";
export function MemberContributionField({value,onChange,minimum=990}:{value:string;onChange:(value:string)=>void;minimum?:number}) {
  const id=useId(),valid=parseMonthlyContribution(value,minimum)!==null;
  const money=(minimum/100).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
  return <section className="memberContributionBox full" aria-labelledby={id+"-title"}>
    <h3 id={id+"-title"}>Was ist Ihnen Ihr Unternehmernetzwerk wert?</h3>
    <p>Sie bestimmen Ihren Monatsbeitrag selbst – ab {money} netto. Alle Mitglieder erhalten dieselben Funktionen.</p>
    <label htmlFor={id}>Ihr monatlicher Beitrag in Euro (netto)<input id={id} type="text" inputMode="decimal" value={value} onChange={event=>onChange(event.target.value)} required maxLength={10} autoComplete="off" aria-invalid={!valid} aria-describedby={id+"-help"}/></label>
    <p id={id+"-help"} className={valid?"contributionHelp":"contributionError"}>{valid?"Ihr gewählter Monatsbeitrag gilt für zwölf Monate. Abrechnung als Jahresbetrag im Voraus, zuzüglich 19 % Umsatzsteuer.":`Bitte mindestens ${money} eingeben. Höchstens zwei Nachkommastellen; Komma oder Punkt sind möglich.`}</p>
    <p>Freiwillige Mehrbeiträge schaffen zusätzliches Budget für B2B-Kampagnen und die Mitgliedergewinnung genau dieses Stadtnetzwerks. Netzwerke mit mehr zusätzlichem Budget können bei der Bewerbung stärker berücksichtigt werden. Der Funktionsumfang bleibt für alle gleich. Neue Mitglieder, Kontakte oder Aufträge können wir nicht garantieren.</p>
  </section>;
}
