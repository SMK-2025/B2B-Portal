"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
type Order = {
  launchPromotion?: {id:string;slot:number;limit?:number;paidFrom:string};
  hasPdf?: boolean;
  paymentStatus?: string;
  paidAt?: string;
  id: string;
  monthlyNetCents: number;
  grossCents: number;
  minimumTermMonths: number;
  serviceStartsAt: string;
  serviceEndsAt: string;
  invoiceReference?: string | null;
  invoiceSentAt?: string | null;
  billingPolicy?: {
    freeUntil: string | null;
    invoiceDate: string;
    paymentDueDate: string;
    autoRenew: boolean;
    renewalDeadline: string | null;
    renewalInvoiceDate: string | null;
    renewalDisabledAt?: string | null;
    renewalMonths: number;
  };
};
const money = (n: number) =>
  (n / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const date = (v: string) =>
  new Date(v.length === 10 ? v + "T12:00:00Z" : v).toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
  });
export function MemberBillingAccount({
  historyNetwork,
}: { historyNetwork?: { id: string; name: string } } = {}) {
  const access = useNetworkAccess(),
    [orders, setOrders] = useState<Order[]>([]),
    [offer, setOffer] = useState<{
      monthlyNetCents: number;
      grossCents: number;
      months: number;
      centrallyFunded: boolean;
      complimentaryAccess?: boolean;
      billing: {
        version: string;
        freeUntil: string | null;
        paidFrom: string | null;
        paidThrough: string | null;
        autoRenew: boolean;
        automaticInvoices: boolean;
      } | null;
    } | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const token = getPortalSession();
    const id = access?.networkId || historyNetwork?.id;
    if (token && id) {
      if (access?.networkId)
        setOffer(
          await portalRequest(`/networks/${access.networkId}/billing-offer`, {
            token,
          }),
        );
      setOrders(
        await portalRequest<Order[]>(`/networks/${id}/my-billing`, { token }),
      );
    }
  }
  useEffect(() => {
    void load().catch(() =>
      setNotice("Abrechnung konnte nicht geladen werden."),
    );
  }, [access?.networkId, historyNetwork?.id]);
  const [networks, setNetworks] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!access?.networkId && !historyNetwork && getPortalSession())
      portalRequest<{ id: string; name: string }[]>(
        "/networks/account/billing-history/networks",
        { token: getPortalSession()! },
      )
        .then(setNetworks)
        .catch(() =>
          setNotice("Zahlungshistorie konnte nicht geladen werden."),
        );
  }, [access?.networkId, historyNetwork?.id]);
  async function accept(e: FormEvent<HTMLFormElement>, o: Order) {
    e.preventDefault();
    if (!offer?.billing) return;
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${access?.networkId}/my-billing/${encodeURIComponent(o.id)}/accept-policy`,
        {
          token: getPortalSession() || "",
          body: {
            acceptedBillingVersion: offer.billing.version,
            acceptedMonthlyNetCents: offer.monthlyNetCents,
            termsAccepted: true,
            authorityConfirmed: true,
            paymentObligationAccepted: true,
            pdfInvoiceAccepted: true,
          },
        },
      );
      await load();
      setNotice(
        "Die angezeigten neuen Abrechnungsbedingungen wurden bestätigt.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Umstellung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  if (networks.length && !access?.networkId && !historyNetwork)
    return (
      <>
        {networks.map((n) => (
          <MemberBillingAccount key={n.id} historyNetwork={n} />
        ))}
      </>
    );
  if (!orders.length)
    return (
      <p role="status">
        {notice ||
          (offer?.complimentaryAccess ? "Dein Mitgliedszugang ist beitragsfrei. Es gibt keine Rechnung für die Netzwerknutzung." : offer?.centrallyFunded
            ? "Dein Netzwerk übernimmt die Kosten. Es gibt keine persönliche Rechnung."
            : "Keine persönlichen Buchungen vorhanden.")}
      </p>
    );
  return (
    <section className="networkCard accountSecurityCard">
      <header>
        <h2>
          Meine Mitgliedschaft & Rechnungen
          {historyNetwork && " · " + historyNetwork.name}
        </h2>
      </header>
      {notice && <p role="status">{notice}</p>}
      {offer?.billing &&
        !offer.centrallyFunded &&
        orders[0] &&
        !orders[0].billingPolicy && (
          <form
            onSubmit={(e) => void accept(e, orders[0])}
            style={{ padding: 20 }}
          >
            <h3>Neue Abrechnungsvereinbarung – freiwillige Umstellung</h3>
            <p>
              {money(offer.monthlyNetCents)} netto / Monat × {offer.months}{" "}
              Monate · Gesamtbetrag inkl. MwSt.: {money(offer.grossCents)}.
            </p>
            <p>
              {offer.billing.freeUntil &&
                `Kostenlos bis ${date(offer.billing.freeUntil)}. `}
              {offer.billing.paidFrom &&
                offer.billing.paidThrough &&
                `Kostenpflichtiger Zeitraum ${date(offer.billing.paidFrom)} bis ${date(offer.billing.paidThrough)}.`}{" "}
              Rechnung 15 Tage vor Ende der kostenlosen Nutzung, Zahlungsziel 14
              Tage. Bei späterer Zustimmung wird die Rechnung nach Bestätigung
              versendet.
            </p>
            <label>
              <input type="checkbox" required />
              Ich bin zur Buchung für mein Unternehmen berechtigt und stimme dem
              angezeigten Gesamtpreis, den{" "}
              <a href="/agb" target="_blank">
                AGB
              </a>
              und dem Rechnungsversand
              als E-Rechnung mit PDF-Darstellung zu. Meine bestehende Buchung
              wird nicht ohne diese Bestätigung umgestellt.
            </label>
            <button disabled={busy || !!access?.readOnly}>
              Neue Abrechnungsvereinbarung verbindlich bestätigen
            </button>
          </form>
        )}
      {orders.map((o) => (
        <div key={o.id} style={{ padding: 20 }}>
          {o.launchPromotion ? <p><strong>Herzlichen Glückwunsch! Als eines der ersten{o.launchPromotion.limit ? ` ${o.launchPromotion.limit}` : ""} Mitglieder erhältst du deine kostenlose Mitgliedschaft.</strong><br/>
            {o.minimumTermMonths} Monate kostenlos · 0,00 € während dieser Startlaufzeit.</p> :
          <p>
            <strong>
              {money(o.monthlyNetCents)} netto pro Monat × {o.minimumTermMonths}{" "}
              Monate
            </strong>
            <br />
            Gesamtbetrag inklusive MwSt.: {money(o.grossCents)}
          </p>}
          <p>
            Leistungszeitraum: {date(o.serviceStartsAt)} bis{" "}
            {date(new Date(Date.parse(o.serviceEndsAt) - 1).toISOString())}
          </p>
          {o.billingPolicy && !o.launchPromotion && (
            <>
              <p>
                {o.billingPolicy.freeUntil && (
                  <>
                    Kostenlos bis einschließlich{" "}
                    {date(o.billingPolicy.freeUntil)}.<br />
                  </>
                )}
                {o.launchPromotion ? "Erste Rechnung nur bei eingeschalteter Verlängerung: " : "Rechnungsversand geplant: "}{date(o.billingPolicy.invoiceDate)} ·
                Zahlungsziel: {date(o.billingPolicy.paymentDueDate)}
              </p>
            </>
          )}
          {o.invoiceReference && (
            <p>
              Rechnung: {o.invoiceReference}
              {o.invoiceSentAt && ` · versendet ${date(o.invoiceSentAt)}`}
            </p>
          )}
          <p>
            Zahlungsstatus:{" "}
            {o.launchPromotion ? "Kostenlose Startlaufzeit – keine Zahlung erforderlich" : o.paymentStatus === "paid"
              ? "Gezahlt" + (o.paidAt ? " am " + date(o.paidAt) : "")
              : o.paymentStatus === "overdue"
                ? "Überfällig"
                : "Offen"}
          </p>
          {o.hasPdf && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const pdf = await portalRequest<{
                    base64: string;
                    number: string;
                  }>(
                    `/networks/${access?.networkId || historyNetwork?.id}/my-billing/${o.id}/pdf`,
                    { token: getPortalSession() || "" },
                  );
                  const url = URL.createObjectURL(
                    new Blob(
                      [
                        Uint8Array.from(atob(pdf.base64), (c) =>
                          c.charCodeAt(0),
                        ),
                      ],
                      { type: "application/pdf" },
                    ),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = pdf.number + ".pdf";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch {
                  setNotice("Rechnung konnte nicht geladen werden.");
                }
              }}
            >
              Rechnung als PDF herunterladen
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
