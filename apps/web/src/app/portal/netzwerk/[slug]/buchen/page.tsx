import { NetworkShell } from "../../../../components/network-shell";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <NetworkShell
      slug={slug}
      title="Jahresmitgliedschaft"
      intro="Alle Funktionen sind in der persönlichen Jahresmitgliedschaft enthalten."
    >
      <section className="networkCard">
        <header>
          <h2>Keine separate Modulbuchung</h2>
        </header>
        <p>
          Partnermitglieder buchen ihren Zugang bei der Registrierung über die
          persönliche Einladung. Initiatoren nutzen die Netzwerkverwaltung
          kostenlos. Zur Verlängerung wenden Sie sich bitte an den
          Plattformbetreiber. Es erfolgt keine automatische kostenpflichtige
          Verlängerung.
        </p>
      </section>
    </NetworkShell>
  );
}
