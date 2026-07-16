const matches = [
  { name: "Nordlicht Digital GmbH", score: 92, details: "Leistung, Branche und Liefermodell passen sehr gut.", state: "Neu" },
  { name: "Rheinwerk Solutions", score: 84, details: "Gute Fachnähe; Verfügbarkeit ist noch ungeklärt.", state: "Prüfen" },
  { name: "Mittelstand Partner AG", score: 78, details: "Passende Referenzen, aber regionale Abdeckung nur hybrid.", state: "Zurückgestellt" }
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#">B2B<span>Match</span></a>
        <nav aria-label="Hauptnavigation">
          <a className="active" href="#dashboard">Übersicht</a>
          <a href="#needs">Bedarfe</a>
          <a href="#matches">Matches</a>
          <a href="#services">Leistungen</a>
        </nav>
        <a className="secondary" href="/registrieren">Registrieren</a>
        <button className="avatar" aria-label="Benutzermenü">MK</button>
      </header>

      <section className="hero" id="dashboard">
        <div>
          <p className="eyebrow">GESCHÜTZTES UNTERNEHMENSNETZWERK</p>
          <h1>Guten Morgen. Ihre nächsten Kooperationen warten.</h1>
          <p className="lead">Sie entscheiden, welcher geprüfte Dienstleister Ihren Bedarf sehen darf.</p>
        </div>
        <button className="primary">Neuen Bedarf anlegen</button>
      </section>

      <section className="stats" aria-label="Kennzahlen">
        <article><strong>3</strong><span>neue Matches</span></article>
        <article><strong>1</strong><span>Profil in Prüfung</span></article>
        <article><strong>2</strong><span>aktive Gespräche</span></article>
        <article><strong>1</strong><span>Termin diese Woche</span></article>
      </section>

      <section className="grid">
        <div className="panel" id="matches">
          <div className="panelHead"><div><p className="eyebrow">IHR BEDARF</p><h2>Externe IT-Sicherheitsprüfung</h2></div><a href="#">Alle ansehen</a></div>
          <p className="muted">Die Dienstleister sehen diesen Bedarf noch nicht.</p>
          <div className="matchList">
            {matches.map((match) => (
              <article className="match" key={match.name}>
                <div className="score" aria-label={`${match.score} Prozent Übereinstimmung`}><strong>{match.score}</strong><span>%</span></div>
                <div className="matchText"><div className="matchTitle"><h3>{match.name}</h3><span>{match.state}</span></div><p>{match.details}</p></div>
                <button className="secondary">Profil prüfen</button>
              </article>
            ))}
          </div>
        </div>

        <aside className="side">
          <section className="panel quality">
            <p className="eyebrow">PROFILQUALITÄT</p><h2>Fast vollständig</h2>
            <div className="progress"><span /></div><p className="muted">82 % · Zwei Angaben fehlen noch.</p>
            <button className="secondary wide">Profil vervollständigen</button>
          </section>
          <section className="panel timeline">
            <p className="eyebrow">NÄCHSTE SCHRITTE</p>
            <ol><li><b>Nordlicht-Profil prüfen</b><span>heute</span></li><li><b>Kennenlerngespräch</b><span>Freitag, 10:00 Uhr</span></li><li><b>Leistungsseite ergänzen</b><span>offen</span></li></ol>
          </section>
        </aside>
      </section>
    </main>
  );
}
