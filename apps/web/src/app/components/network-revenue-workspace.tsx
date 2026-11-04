"use client";
import { NetworkText } from "./network-text-editor";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
type Member = {
  id: string;
  status: string;
  user: { firstName: string; lastName: string } | null;
  organization: { displayName: string; legalName: string } | null;
};
type Revenue = {
  id: string;
  amountNetCents: number;
  periodFrom: string;
  periodTo: string;
  status: "recorded" | "confirmed" | "paid" | "cancelled";
  note: string | null;
  referring: { organizationName: string; contactName: string };
  beneficiary: { organizationName: string; contactName: string };
};
const statusLabels = {
  recorded: "Erfasst",
  confirmed: "Bestätigt",
  paid: "Abgerechnet",
  cancelled: "Storniert",
};
export function NetworkRevenueWorkspace() {
  const access = useNetworkAccess(),
    networkId = access?.networkId || "",
    [members, setMembers] = useState<Member[]>([]),
    [rows, setRows] = useState<Revenue[]>([]),
    [dialog, setDialog] = useState(false),
    [notice, setNotice] = useState("");
  const allowed =
    access?.role === "platform_admin" || access?.role === "network_admin";
  async function load() {
    const token = getPortalSession();
    if (!token || !networkId || !allowed) return;
    try {
      const [m, r] = await Promise.all([
        portalRequest<Member[]>(`/networks/${networkId}/memberships`, {
          token,
        }),
        portalRequest<Revenue[]>(`/networks/${networkId}/revenues`, { token }),
      ]);
      setMembers(m.filter((x) => x.status === "active"));
      setRows(r);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Umsätze konnten nicht geladen werden.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, [networkId, allowed]);
  const total = useMemo(
    () =>
      rows
        .filter((x) => x.status !== "cancelled")
        .reduce((sum, x) => sum + x.amountNetCents, 0),
    [rows],
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    try {
      await portalRequest(`/networks/${networkId}/revenues`, {
        token,
        body: Object.fromEntries(form),
      });
      setDialog(false);
      await load();
      setNotice("Vermittelter Umsatz wurde vertraulich gespeichert.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Speichern nicht möglich.");
    }
  }
  function exportExcel() {
    const lines = [
      [
        "Zeitraum",
        "Vermittelndes Mitglied",
        "Begünstigtes Mitglied",
        "Betrag netto",
        "Status",
      ],
      ...rows.map((x) => [
        `${x.periodFrom} – ${x.periodTo}`,
        x.referring.organizationName,
        x.beneficiary.organizationName,
        (x.amountNetCents / 100).toFixed(2),
        statusLabels[x.status],
      ]),
    ];
    const html = `<table>${lines.map((r) => `<tr>${r.map((c) => `<td>${String(c).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</td>`).join("")}</tr>`).join("")}</table>`,
      a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" }),
    );
    a.download = "vermittelter-umsatz.xls";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  if (!allowed)
    return (
      <section className="networkCard">
        <div className="networkEmpty">
          <b>
            <NetworkText id="ui.network-revenue-workspace.b5f98e33a5a9cfba">
              Geschützter Verwaltungsbereich
            </NetworkText>
          </b>
          <p>
            <NetworkText id="ui.network-revenue-workspace.00e7501fd6e77323">
              Vermittelte Umsätze sind ausschließlich für berechtigte
              Netzwerkadministratoren sichtbar.
            </NetworkText>
          </p>
        </div>
      </section>
    );
  const name = (m: Member) =>
    m.organization?.displayName ||
    m.organization?.legalName ||
    `${m.user?.firstName || ""} ${m.user?.lastName || ""}`.trim() ||
    "Mitglied";
  return (
    <div className="networkFunctionalWorkspace">
      <div className="networkMemberStats">
        <button>
          <strong>{rows.length}</strong>
          <span>
            <NetworkText id="ui.network-revenue-workspace.c74ea22adc19e740">
              Vermittlungen
            </NetworkText>
          </span>
        </button>
        <button>
          <strong>
            {(total / 100).toLocaleString("de-DE", {
              style: "currency",
              currency: "EUR",
            })}
          </strong>
          <span>
            <NetworkText id="ui.network-revenue-workspace.2233b3a2d5bdc96a">
              Gesamt netto
            </NetworkText>
          </span>
        </button>
        <button>
          <strong>{rows.filter((x) => x.status === "confirmed").length}</strong>
          <span>
            <NetworkText id="ui.network-revenue-workspace.61794f0a3e3a5ba7">
              Bestätigt
            </NetworkText>
          </span>
        </button>
      </div>
      <section className="networkCard">
        <header>
          <div>
            <span>
              <NetworkText id="ui.network-revenue-workspace.3e5e875244bf5b28">
                VERTRAULICHE AUSWERTUNG
              </NetworkText>
            </span>
            <h2>
              <NetworkText id="ui.network-revenue-workspace.587a6959aad5ae06">
                Vermittelter Umsatz
              </NetworkText>
            </h2>
          </div>
          <div>
            <button onClick={exportExcel} disabled={!rows.length}>
              <NetworkText id="ui.network-revenue-workspace.48d53635551c8fd4">
                Excel
              </NetworkText>
            </button>
            {!access?.readOnly && (
              <button
                className="networkPrimary"
                onClick={() => setDialog(true)}
              >
                <NetworkText id="ui.network-revenue-workspace.97cf624c7033dbf5">
                  ＋ Umsatz erfassen
                </NetworkText>
              </button>
            )}
          </div>
        </header>
        <div className="networkContentRows">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <span className={`networkMemberStatus ${row.status}`}>
                  {statusLabels[row.status]}
                </span>
                <h3>
                  {row.referring.organizationName} →{" "}
                  {row.beneficiary.organizationName}
                </h3>
                <p>
                  {row.periodFrom}
                  <NetworkText id="ui.network-revenue-workspace.96147cdbfd6955d7">
                    bis{" "}
                  </NetworkText>
                  {row.periodTo}
                  {row.note ? ` · ${row.note}` : ""}
                </p>
              </div>
              <strong>
                {(row.amountNetCents / 100).toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                })}
              </strong>
            </article>
          ))}
        </div>
        {!rows.length && (
          <div className="networkEmpty">
            <b>
              <NetworkText id="ui.network-revenue-workspace.87e843e4f1e511d1">
                Noch keine vermittelten Umsätze erfasst
              </NetworkText>
            </b>
            <p>
              <NetworkText id="ui.network-revenue-workspace.395862a3f8a64da5">
                Die Angaben bleiben vollständig innerhalb der berechtigten
                Netzwerkadministration.
              </NetworkText>
            </p>
          </div>
        )}
      </section>
      {dialog && (
        <div className="networkModalBackdrop">
          <section className="networkModal networkContentModal">
            <header>
              <div>
                <span>
                  <NetworkText id="ui.network-revenue-workspace.f53f816844dd6bf9">
                    VERTRAULICHE ERFASSUNG
                  </NetworkText>
                </span>
                <h2>
                  <NetworkText id="ui.network-revenue-workspace.068ff19cf2cb132b">
                    Vermittelten Umsatz erfassen
                  </NetworkText>
                </h2>
              </div>
              <button onClick={() => setDialog(false)}>×</button>
            </header>
            <form onSubmit={submit}>
              <div>
                <label>
                  <NetworkText id="ui.network-revenue-workspace.dbfe924a3f01d8d1">
                    Vermittelndes Mitglied
                  </NetworkText>
                  <select name="referringMembershipId" required>
                    {members.map((m) => (
                      <option value={m.id} key={m.id}>
                        {name(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <NetworkText id="ui.network-revenue-workspace.3f02c49be6db03ad">
                    Begünstigtes Mitglied
                  </NetworkText>
                  <select name="beneficiaryMembershipId" required>
                    {members.map((m) => (
                      <option value={m.id} key={m.id}>
                        {name(m)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <label>
                  <NetworkText id="ui.network-revenue-workspace.1e53c456fc59ba44">
                    Umsatzbetrag netto
                  </NetworkText>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </label>
                <label>
                  <NetworkText id="ui.network-revenue-workspace.920e413c7d411b61">
                    Status
                  </NetworkText>
                  <select name="status">
                    <option value="recorded">Erfasst</option>
                    <option value="confirmed">Bestätigt</option>
                    <option value="paid">Abgerechnet</option>
                    <option value="cancelled">Storniert</option>
                  </select>
                </label>
              </div>
              <div>
                <label>
                  <NetworkText id="ui.network-revenue-workspace.d950d9fce8a13d7c">
                    Zeitraum von
                  </NetworkText>
                  <input name="periodFrom" type="date" required />
                </label>
                <label>
                  <NetworkText id="ui.network-revenue-workspace.1ac37c1623b4e872">
                    Zeitraum bis
                  </NetworkText>
                  <input name="periodTo" type="date" required />
                </label>
              </div>
              <label>
                <NetworkText id="ui.network-revenue-workspace.5228d35dbe0954e8">
                  Interne Notiz
                </NetworkText>
                <textarea name="note" rows={3} />
              </label>
              <div className="adminNetworkDialogActions">
                <button type="button" onClick={() => setDialog(false)}>
                  <NetworkText id="ui.network-revenue-workspace.f7ff1178af202f6f">
                    Abbrechen
                  </NetworkText>
                </button>
                <button className="networkPrimary">
                  <NetworkText id="ui.network-revenue-workspace.c06795e64bbe0137">
                    Vertraulich speichern
                  </NetworkText>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {notice && (
        <div className="networkNotice">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
    </div>
  );
}
