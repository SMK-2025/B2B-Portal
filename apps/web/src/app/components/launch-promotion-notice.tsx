export type LaunchPromotion = {
  id: string;
  version: string;
  limit: number;
  available?: boolean;
  remaining?: number;
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
  const available =
    promotion.available ??
    ((promotion.remaining || 0) > 0 || promotion.reserved);
  if(!available) return null;
  return (
    <aside
      className="full"
      style={{
        border:
          "1px solid var(--auth-primary, var(--lev-brand, var(--network-accent, #536bdb)))",
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
          ? `Dein Startvorteil: ${promotion.freeMonths} Monate kostenlos`
          : "Deine Mitgliedschaft im Netzwerk"}
      </strong>
      {available && (
        <p>
          Als eines der ersten {promotion.limit} Mitglieder kannst du
          Unternehmen entdecken, Kontakte knüpfen und dich{" "}
          {promotion.freeMonths} Monate kostenlos vernetzen.
        </p>
      )}
    </aside>
  );
}
