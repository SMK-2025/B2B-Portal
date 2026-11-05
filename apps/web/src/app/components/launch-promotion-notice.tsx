export type LaunchPromotion = {
  id: string;
  version: string;
  limit: number;
  used: number;
  remaining: number;
  freeMonths: number;
  reserved?: boolean;
};
export function LaunchPromotionNotice({
  promotion,
  monthlyNetCents,
}: {
  promotion?: LaunchPromotion | null;
  monthlyNetCents: number;
}) {
  if (!promotion) return null;
  const available = promotion.remaining > 0 || promotion.reserved;
  const money = (c: number) =>
    (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  return (
    <aside
      className="full"
      style={{
        border: "1px solid var(--auth-primary, var(--lev-brand, var(--network-accent, #536bdb)))",
        borderRadius: 14,
        padding: 18,
        marginBlock: 16,
        background: "#fff",
        color: "#173143",
      }}
      aria-label="Kostenlose Startaktion"
    >
      <strong style={{ fontSize: "1.15rem" }}>
        {available
          ? `${promotion.freeMonths} Monate kostenlos vernetzen`
          : `Die ${promotion.limit} kostenlosen Startplätze sind vergeben`}
      </strong>
      <p role="status">
        {promotion.used} von {promotion.limit} Startplätzen vergeben ·{" "}
        {promotion.remaining} verfügbar.
      </p>
      {available && (
        <p>
          Für die ersten {promotion.limit} freigegebenen Unternehmen. Dein Platz
          wird beim verbindlichen Beitritt vergeben; die Anfrage reserviert noch
          keinen Platz.
        </p>
      )}
      <p>
        {available ? "Anschließend" : "Regulär"} automatische Verlängerung um
        jeweils 12 Monate zu {money(monthlyNetCents)} netto pro Monat:{" "}
        {money(monthlyNetCents * 12)} netto +{" "}
        {money(Math.round(monthlyNetCents * 12 * 0.19))} MwSt. ={" "}
        <strong>
          {money(Math.round(monthlyNetCents * 12 * 1.19))} im Voraus pro Jahr
        </strong>
        .
      </p>
      <p>
        Im Konto bis einschließlich 16 Tage vor Beginn der nächsten Laufzeit
        ausschaltbar. Rechnungsversand 15 Tage vorher, Zahlungsziel 14 Tage.{" "}
        {available &&
          "Während der kostenlosen Startlaufzeit fällt keine Rechnung an."}
      </p>
    </aside>
  );
}
