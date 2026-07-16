const steps = [
  { number: "01", title: "Bedarf vertraulich beschreiben", text: "Formulieren Sie, welche Leistung Ihr Unternehmen sucht. Ihre Identität bleibt zunächst geschützt." },
  { number: "02", title: "Passende Partner entdecken", text: "B2B Matching bewertet Leistungsprofil, Erfahrung, Region und Rahmenbedingungen – transparent und nachvollziehbar." },
  { number: "03", title: "Sichtbarkeit selbst freigeben", text: "Sie prüfen den Dienstleister zuerst. Nur wenn Sie zustimmen, wird Ihr Bedarf für ihn sichtbar." },
  { number: "04", title: "Sicher ins Gespräch kommen", text: "Chat, Statusverlauf und Termine bringen beide Seiten strukturiert von der Empfehlung zur Kooperation." }
];

const benefits = [
  ["shield", "Vertraulich von Anfang an", "Unternehmensdaten bleiben verborgen, bis Sie einen passenden Dienstleister bewusst freigeben."],
  ["spark", "Relevanz statt Nachrichtenflut", "Wiederkehrendes Matching priorisiert passende Anbieter mit einem verständlichen Prozentwert."],
  ["check", "Geprüfte Profilqualität", "Neue Profile und Leistungsseiten durchlaufen Qualitätsprüfung und Freigabe, bevor sie sichtbar werden."],
  ["flow", "Ein Prozess, ein Status", "Entscheidungen, Gespräche, Termine und nächste Schritte bleiben für alle Beteiligten nachvollziehbar."]
];

const categories = ["IT & Digitalisierung", "Marketing & Kommunikation", "Personal & Recruiting", "Finanzen & Recht", "Beratung & Strategie", "Produktion & Logistik"];

const faqs = [
  ["Ist B2B Matching eine Ausschreibungsplattform?", "Nein. Unternehmen veröffentlichen einen konkreten Bedarf, ohne einen offenen Preiswettbewerb auszulösen. Im Mittelpunkt stehen Passung, Qualität und eine vertrauliche Geschäftsanbahnung."],
  ["Wann sieht ein Dienstleister meine Unternehmensdaten?", "Erst nach Ihrer ausdrücklichen Freigabe. Zuvor werden nur die für das Matching notwendigen, anonymisierten Informationen zum Bedarf verwendet."],
  ["Wie werden Dienstleister geprüft?", "Profile werden zunächst per E-Mail bestätigt und vor der Veröffentlichung auf Vollständigkeit, Plausibilität und Leistungsqualität geprüft. Weitere Verifizierungsstufen sind vorgesehen."],
  ["Kann ein Unternehmen Auftraggeber und Dienstleister sein?", "Ja. Ein Unternehmensprofil kann eigene Bedarfe veröffentlichen und gleichzeitig Leistungen anbieten."],
  ["Für welche Branchen ist das Netzwerk gedacht?", "B2B Matching ist branchenoffen und richtet sich an Unternehmen jeder Größe in Deutschland – vom Einzelunternehmen bis zur Unternehmensgruppe."]
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    shield: <><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    spark: <><path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9L12 3Z"/><path d="m18 15 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    flow: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h5a3 3 0 0 1 3 3v6M13 18H8a3 3 0 0 1-3-3V9"/></>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://b2bmatching.de";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${baseUrl}/#organization`, name: "B2B Matching", url: baseUrl, slogan: "Bedarf trifft Kompetenz.", description: "Vertrauliches B2B-Netzwerk für bedarfsgerechtes Dienstleister-Matching in Deutschland" },
      { "@type": "WebSite", "@id": `${baseUrl}/#website`, url: baseUrl, name: "B2B Matching", inLanguage: "de-DE", publisher: { "@id": `${baseUrl}/#organization` } },
      { "@type": "Service", "@id": `${baseUrl}/#service`, name: "B2B-Dienstleister-Matching", provider: { "@id": `${baseUrl}/#organization` }, areaServed: { "@type": "Country", name: "Deutschland" }, audience: { "@type": "BusinessAudience", audienceType: "Unternehmen und B2B-Dienstleister" }, description: "Vertrauliche Veröffentlichung von Unternehmensbedarfen, qualitätsgeprüfte Dienstleisterprofile und KI-gestütztes Matching." },
      { "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) }
    ]
  };

  return (
    <main className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="landingHeader">
        <a className="logo" href="#top" aria-label="B2B Matching Startseite"><span className="logoMark">B2</span><span>B2B <span>Matching</span></span></a>
        <nav className="landingNav" aria-label="Hauptnavigation">
          <a href="#so-funktionierts">So funktioniert&apos;s</a><a href="#vorteile">Vorteile</a><a href="#dienstleistungen">Dienstleistungen</a><a href="#faq">FAQ</a>
        </nav>
        <div className="headerActions"><a className="textLink" href="#">Anmelden</a><a className="button buttonSmall" href="/registrieren">Kostenlos starten <span>↗</span></a></div>
      </header>

      <section className="landingHero" id="top">
        <div className="heroGlow heroGlowOne"/><div className="heroGlow heroGlowTwo"/>
        <div className="heroCopy">
          <div className="pill"><span/> Das geschützte Netzwerk für B2B-Kooperationen</div>
          <h1>Der richtige Dienstleister.<br/><em>Bevor Sie lange suchen.</em></h1>
          <p className="heroLead">Beschreiben Sie Ihren Bedarf vertraulich. Unsere Matching-Logik findet qualitätsgeprüfte Dienstleister – und Sie entscheiden, wer davon erfahren darf.</p>
          <div className="heroActions"><a className="button" href="/registrieren">Unternehmen registrieren <span>→</span></a><a className="button buttonGhost" href="#so-funktionierts"><span className="play">▶</span> In 90 Sekunden verstehen</a></div>
          <div className="trustLine"><div className="miniAvatars"><span>MK</span><span>NS</span><span>RW</span></div><p><strong>Für Unternehmen jeder Größe</strong><br/>Deutschlandweit · branchenübergreifend</p></div>
        </div>
        <div className="heroVisual" aria-label="Beispiel eines intelligenten Dienstleister-Matchings">
          <div className="floatTag tagTop">✓ Profil qualitätsgeprüft</div>
          <div className="matchCard">
            <div className="matchCardTop"><div><small>NEUES MATCH FÜR IHREN BEDARF</small><h2>Externe IT-Sicherheitsprüfung</h2></div><span className="more">•••</span></div>
            <div className="provider"><div className="providerLogo">N</div><div><strong>Nordlicht Digital GmbH</strong><span>IT-Security · Hamburg · Hybrid</span></div><div className="matchScore"><b>92%</b><span>Match</span></div></div>
            <div className="matchReasons"><span>✓ Passende Expertise</span><span>✓ Vergleichbare Referenzen</span><span>✓ Zeitraum verfügbar</span></div>
            <div className="matchAction"><div><span className="lock">⌾</span><p><strong>Sie haben die Kontrolle</strong><br/><small>Der Dienstleister sieht Ihren Bedarf noch nicht.</small></p></div><button>Profil ansehen →</button></div>
          </div>
          <div className="floatTag tagBottom"><span className="pulseDot"/> Matching wurde aktualisiert</div>
        </div>
      </section>

      <section className="proofBar"><p>Gebaut für vertrauensvolle Zusammenarbeit zwischen</p><div><span>MITTELSTAND</span><span>START-UPS</span><span>FREIBERUFLERN</span><span>UNTERNEHMENSGRUPPEN</span></div></section>

      <section className="section intro" id="so-funktionierts">
        <div className="sectionHeading"><div><p className="sectionKicker">SO FUNKTIONIERT B2BMATCH</p><h2>Von der Suche zur Zusammenarbeit.<br/><em>Einfach, sicher, transparent.</em></h2></div><p>Kein öffentliches Ausschreibungsportal. Kein unübersichtliches Anbieter-Verzeichnis. Ein geführter Prozess, bei dem Qualität und Kontrolle an erster Stelle stehen.</p></div>
        <div className="steps">{steps.map((step, index) => <article className="step" key={step.number}><span className="stepNumber">{step.number}</span><div className={`stepIcon stepIcon${index+1}`}><Icon name={index === 0 ? "flow" : index === 1 ? "spark" : index === 2 ? "shield" : "check"}/></div><h3>{step.title}</h3><p>{step.text}</p>{index < steps.length - 1 && <span className="stepArrow">→</span>}</article>)}</div>
      </section>

      <section className="featureBand" id="vorteile"><div className="section">
        <div className="sectionHeading compact"><div><p className="sectionKicker">WARUM B2BMATCH</p><h2>Geschäftsanbahnung,<br/><em>neu gedacht.</em></h2></div><p>Ihr Bedarf verdient bessere Antworten als unaufgeforderte Verkaufsmails und anonyme Trefferlisten.</p></div>
        <div className="benefitGrid">{benefits.map(([icon,title,text]) => <article key={title}><div className="benefitIcon"><Icon name={icon}/></div><h3>{title}</h3><p>{text}</p><a href="#so-funktionierts" aria-label={`Mehr über ${title}`}>Mehr erfahren <span>→</span></a></article>)}</div>
      </div></section>

      <section className="section controlSection">
        <div className="controlVisual"><div className="privacyOrbit"><span className="orbit orbit1"/><span className="orbit orbit2"/><div className="privacyCore"><Icon name="shield"/><strong>Ihre Daten</strong><span>bleiben geschützt</span></div><div className="orbitItem oi1">Bedarf</div><div className="orbitItem oi2">Profil</div><div className="orbitItem oi3">Kontakt</div></div></div>
        <div className="controlCopy"><p className="sectionKicker">PRIVACY BY DESIGN</p><h2>Sie bestimmen, wer<br/><em>was über Sie erfährt.</em></h2><p>Bei B2B Matching beginnt ein Kontakt nicht mit der Offenlegung Ihrer Daten. Sie sehen zuerst, wer zu Ihrem Bedarf passt – und geben Informationen gezielt frei.</p><ul><li><span>✓</span><div><strong>Anonymer Bedarf</strong><p>Unternehmensname und Kontaktdaten bleiben zunächst verborgen.</p></div></li><li><span>✓</span><div><strong>Selektive Freigabe</strong><p>Jeder Dienstleister wird von Ihnen einzeln bestätigt oder abgelehnt.</p></div></li><li><span>✓</span><div><strong>Nachvollziehbare Entscheidungen</strong><p>Aktivitäten und Statusänderungen werden lückenlos dokumentiert.</p></div></li></ul></div>
      </section>

      <section className="categorySection" id="dienstleistungen"><div className="section"><div className="centerHeading"><p className="sectionKicker">BRANCHENOFFEN VON ANFANG AN</p><h2>Für jeden unternehmerischen Bedarf<br/><em>den passenden Partner.</em></h2><p>Von spezialisierten Projekten bis zu langfristigen Kooperationen.</p></div><div className="categories">{categories.map((category,i)=><a href="/registrieren" key={category}><span className={`catIcon cat${i+1}`}>{["⌘","✦","◎","§","◇","↗"][i]}</span><strong>{category}</strong><span className="catArrow">→</span></a>)}</div><p className="allCategories">Ihre Kategorie ist nicht dabei? <a href="/registrieren">Alle Dienstleistungen entdecken →</a></p></div></section>

      <section className="section faqSection" id="faq"><div className="centerHeading"><p className="sectionKicker">HÄUFIGE FRAGEN</p><h2>Gut zu wissen, <em>bevor es losgeht.</em></h2></div><div className="faqList">{faqs.map(([q,a],i)=><details key={q} open={i===0}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

      <section className="cta"><div className="ctaGlow"/><div><p className="sectionKicker">BEREIT FÜR BESSERE GESCHÄFTSKONTAKTE?</p><h2>Ihr nächster starker Partner<br/>ist vielleicht schon hier.</h2><p>Erstellen Sie Ihr Unternehmensprofil und starten Sie mit Ihrem ersten Bedarf.</p><div><a className="button buttonLight" href="/registrieren">Jetzt kostenlos registrieren <span>→</span></a><span>Keine Kreditkarte erforderlich</span></div></div></section>

      <footer><div className="footerTop"><div><a className="logo footerLogo" href="#top"><span className="logoMark">B2</span><span>B2B <span>Matching</span></span></a><p>Das geschützte Netzwerk für bessere B2B-Kooperationen.</p></div><div className="footerLinks"><div><strong>Plattform</strong><a href="#so-funktionierts">So funktioniert&apos;s</a><a href="#vorteile">Vorteile</a><a href="#dienstleistungen">Dienstleistungen</a></div><div><strong>Unternehmen</strong><a href="/registrieren">Registrieren</a><a href="#">Für Dienstleister</a><a href="#faq">FAQ</a></div><div><strong>Rechtliches</strong><a href="#">Datenschutz</a><a href="#">Impressum</a><a href="#">AGB</a></div></div></div><div className="footerBottom"><span>© 2026 B2B Matching. Alle Rechte vorbehalten.</span><span>Entwickelt für starke Verbindungen.</span></div></footer>
    </main>
  );
}
