"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
type Order = {
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
export function MemberBillingAccount() {
  const access = useNetworkAccess(),
    [orders, setOrders] = useState<Order[]>([]),
    [offer, setOffer] = useState<{
      monthlyNetCents: number;
      grossCents: number;
      months: number;
      centrallyFunded: boolean;
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
    if (token && access?.networkId) {
      setOffer(
        await portalRequest(`/networks/${access.networkId}/billing-offer`, {
          token,
        }),
      );
      setOrders(
        await portalRequest<Order[]>(
          `/networks/${access.networkId}/my-billing`,
          { token },
        ),
      );
    }
  }
  useEffect(() => {
    void load().catch(() =>
      setNotice("Abrechnung konnte nicht geladen werden."),
    );
  }, [access?.networkId]);
  async function toggle(o: Order) {
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${access?.networkId}/my-billing/${encodeURIComponent(o.id)}/renewal`,
        {
          token: getPortalSession() || "",
          body: { enabled: !!o.billingPolicy?.renewalDisabledAt },
        },
      );
      await load();
      setNotice("Verlängerungseinstellung gespeichert.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
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
            renewalAccepted: true,
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
  if (!orders.length) return notice ? <p role="status">{notice}</p> : null;
  return (
    <section className="networkCard accountSecurityCard">
      <header>
        <h2>Meine Abrechnung & Verlängerung</h2>
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
            {offer.billing.autoRenew && (
              <p>
                Automatische Verlängerung um zwölf Monate zum bestätigten
                Monatspreis. Bei Folgesaison am 01.07. ausschaltbar bis 15.06.
                einschließlich, Folgerechnung am 16.06.
              </p>
            )}
            <label>
              <input type="checkbox" required />
              Ich bin zur Buchung für mein Unternehmen berechtigt und stimme dem
              angezeigten Gesamtpreis, den{" "}
              <a href="/agb" target="_blank">
                AGB
              </a>
              , der beschriebenen Verlängerungsregel und dem Rechnungsversand
              als E-Rechnung mit PDF-Darstellung zu. Meine bestehende Buchung
              wird nicht ohne diese Bestätigung umgestellt.
            </label>
            <button disabled={busy || !!access?.readOnly}>
              Neue Abrechnungsvereinbarung verbindlich bestätigen
            </button>
          </form>
        )}
      {orders.slice(0, 3).map((o) => (
        <div key={o.id} style={{ padding: 20 }}>
          <p>
            <strong>
              {money(o.monthlyNetCents)} netto pro Monat × {o.minimumTermMonths}{" "}
              Monate
            </strong>
            <br />
            Gesamtbetrag inklusive MwSt.: {money(o.grossCents)}
          </p>
          <p>
            Leistungszeitraum: {date(o.serviceStartsAt)} bis{" "}
            {date(new Date(Date.parse(o.serviceEndsAt) - 1).toISOString())}
          </p>
          {o.billingPolicy ? (
            <>
              <p>
                {o.billingPolicy.freeUntil && (
                  <>
                    Kostenlos bis einschließlich{" "}
                    {date(o.billingPolicy.freeUntil)}.<br />
                  </>
                )}
                Rechnungsversand geplant: {date(o.billingPolicy.invoiceDate)} ·
                Zahlungsziel: {date(o.billingPolicy.paymentDueDate)}
              </p>
              {o.billingPolicy.autoRenew && (
                <>
                  <p>
                    Automatische Verlängerung um {o.billingPolicy.renewalMonths}{" "}
                    Monate:{" "}
                    <strong>
                      {o.billingPolicy.renewalDisabledAt
                        ? "ausgeschaltet"
                        : "eingeschaltet"}
                    </strong>
                    <br />
                    Änderung möglich bis einschließlich{" "}
                    {date(o.billingPolicy.renewalDeadline!)}. Folgerechnung:{" "}
                    {date(o.billingPolicy.renewalInvoiceDate!)}.
                  </p>
                  <button
                    type="button"
                    disabled={busy || !!access?.readOnly}
                    onClick={() => void toggle(o)}
                  >
                    {o.billingPolicy.renewalDisabledAt
                      ? "Verlängerung wieder einschalten"
                      : "Automatische Verlängerung ausschalten"}
                  </button>
                </>
              )}
            </>
          ) : (
            <p>
              Für diese bestehende Buchung wurde keine neue automatische
              Verlängerung vereinbart.
            </p>
          )}
          {o.invoiceReference && (
            <p>
              Rechnung: {o.invoiceReference}
              {o.invoiceSentAt && ` · versendet ${date(o.invoiceSentAt)}`}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
