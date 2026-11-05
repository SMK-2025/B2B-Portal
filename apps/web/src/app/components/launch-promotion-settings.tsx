"use client";
import { useState } from "react";
export function LaunchPromotionSettings({
  value,
  used = 0,
}: {
  value?: { enabled: boolean; limit: number; freeMonths: number } | null;
  used?: number;
}) {
  const [enabled, setEnabled] = useState(value?.enabled || false);
  return (
    <fieldset
      className="full"
      style={{ border: "1px solid #d8deea", borderRadius: 12, padding: 18 }}
    >
      <legend>Begrenzte Startaktion</legend>
      <label className="legalConsent full">
        <input
          type="checkbox"
          name="launchEnabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>
          Erste Unternehmen für eine begrenzte Zeit kostenlos aufnehmen
        </span>
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
          gap: 16,
          marginBlock: 14,
        }}
      >
        <label>
          Anzahl kostenloser Plätze
          <input
            type="number"
            name="launchLimit"
            min={Math.max(1, used)}
            max={100000}
            defaultValue={value?.limit || 100}
            required
          />
        </label>
        <label>
          Kostenlose Monate je Unternehmen
          <input
            type="number"
            name="launchMonths"
            min={1}
            max={24}
            defaultValue={value?.freeMonths || 6}
            required
          />
        </label>
      </div>
      <p>
        {used} Plätze bereits vergeben. Gelöschte Zugänge geben keinen zweiten
        Aktionsplatz frei.
      </p>
      <small>
        Für individuell zahlende Netzwerke ohne feste Datumszeiträume.
        Änderungen gelten ausschließlich für neue Buchungen.
      </small>
    </fieldset>
  );
}
