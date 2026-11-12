"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { parseMailingCsv } from "../lib/mailing-csv";
type Network = {
  id: string;
  name: string;
  slug: string;
  primaryColor?: string;
  logoUrl?: string;
};
type Consent = { at: string; source: string };
type Lead = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  marketing?: Consent;
  tracking?: Consent;
  suppressed: boolean;
};
type Recipient = {
  leadId: string;
  email: string;
  company: string;
  state: string;
  submittedAt?: string;
  imageRequests: number;
  homepageClicks: number;
  landingClicks: number;
  registerClicks: number;
  views: number;
  registered: boolean;
  verified: boolean;
  delivered: boolean;
  bounced: boolean;
  dropped?: boolean;
  deferred?: boolean;
  spamReported?: boolean;
  unsubscribed?: boolean;
  tracking?: boolean;
  trackingIncluded?: boolean | null;
  automatedSignals: number;
  error?: string;
  events: Array<{
    kind: string;
    at: string;
    link?: string;
    automated?: boolean;
  }>;
};
type Campaign = {
  recipientListId: string;
  id: string;
  name: string;
  subject: string;
  body: string;
  revision: number;
  locked: boolean;
  paused?: boolean;
  automatic?: { enabled: boolean; nextAt: string; lastError?: string };
  eligible: number;
  stats: Record<string, number>;
  recipients: Recipient[];
};
type Workspace = {
  lists: {
    id: string;
    name: string;
    source: string;
    createdAt: string;
    leadIds: string[];
    total: number;
    blocked: number;
    available: number;
  }[];
  leads: Lead[];
  campaigns: Campaign[];
  defaults: { subject: string; body: string };
  readiness: { mail: boolean; tracking: boolean; deliveryWebhook: boolean };
};
const stamp = (s?: string) => (s ? new Date(s).toLocaleString("de-DE") : "–");
const eventNames: Record<string, string> = {
  image: "Bildabruf",
  click: "Linkaufruf",
  view: "Seitenaufruf",
  registered: "Registrierung",
  verified: "E-Mail bestätigt",
  delivered: "Mailserver hat angenommen",
  bounce: "Unzustellbar",
  dropped: "Abgelehnt",
  spamreport: "Spam gemeldet",
  deferred: "Verzögert",
};
export function MailingsWorkspace() {
  const [networks, setNetworks] = useState<Network[]>([]),
    [network, setNetwork] = useState("");
  const [data, setData] = useState<Workspace | null>(null),
    [tab, setTab] = useState("campaigns"),
    [selected, setSelected] = useState("");
  const [draft, setDraft] = useState({ name: "", subject: "", body: "" }),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [recipientListId, setRecipientListId] = useState("");
  const [contactListId, setContactListId] = useState("");
  const [listName, setListName] = useState("");
  const [sendingId, setSendingId] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportPage, setReportPage] = useState(0);
  useEffect(
    () => setReportPage(0),
    [selected, reportSearch, reportFilter, network],
  );
  const [stopping, setStopping] = useState(false);
  const [csv, setCsv] = useState<ReturnType<typeof parseMailingCsv>>([]),
    [source, setSource] = useState(""),
    [tracking, setTracking] = useState(false),
    [trackAt, setTrackAt] = useState(""),
    [trackProof, setTrackProof] = useState("");
  const [preview, setPreview] = useState<string | null>(null),
    [consentLead, setConsentLead] = useState<Lead | null>(null),
    [events, setEvents] = useState<Recipient | null>(null),
    [sendConfirm, setSendConfirm] = useState(false),
    [confirmName, setConfirmName] = useState("");
  const current = networks.find((n) => n.id === network),
    campaign = data?.campaigns.find((c) => c.id === selected);
  const selectedList = data?.lists?.find((list) => list.id === recipientListId);
  const measurable = (r: Recipient) =>
    r.trackingIncluded === true ||
    (r.trackingIncluded !== false &&
      (r.imageRequests > 0 ||
        r.homepageClicks + r.landingClicks + r.registerClicks > 0 ||
        r.registered));
  const measuredRecipients =
    campaign?.recipients.filter(measurable).length || 0;
  const unmeasuredRecipients =
    (campaign?.recipients.length || 0) - measuredRecipients;
  const pendingWithoutTracking = (data?.leads || []).filter(
    (l) =>
      selectedList?.leadIds.includes(l.id) &&
      !l.suppressed &&
      !l.tracking &&
      !campaign?.recipients.some((r) => r.leadId === l.id),
  ).length;
  const contactList = data?.lists?.find((list) => list.id === contactListId);
  const visibleLeads = (data?.leads || []).filter(
    (lead) => !contactList || contactList.leadIds.includes(lead.id),
  );
  const listChanged =
    !!campaign && recipientListId !== (campaign.recipientListId || "");
  const reportRecipients = (campaign?.recipients || []).filter((r) => {
    if (
      !`${r.email} ${r.company}`
        .toLocaleLowerCase()
        .includes(reportSearch.trim().toLocaleLowerCase())
    )
      return false;
    if (reportFilter === "delivered") return r.delivered;
    if (reportFilter === "opened") return r.imageRequests > 0;
    if (reportFilter === "clicked")
      return r.homepageClicks + r.landingClicks + r.registerClicks > 0;
    if (reportFilter === "failed")
      return (
        r.bounced || r.dropped || r.spamReported || r.state !== "submitted"
      );
    if (reportFilter === "unsubscribed") return r.unsubscribed;
    if (reportFilter === "registered") return r.registered;
    return true;
  });
  const reportPages = Math.max(1, Math.ceil(reportRecipients.length / 25));
  const safeReportPage = Math.min(reportPage, reportPages - 1);
  async function request<T>(path: string, body?: unknown) {
    const token = getPortalSession();
    if (!token) throw new Error("Bitte als Plattformbetreiber anmelden.");
    return portalRequest<T>("/mailings" + path, {
      token,
      ...(path.endsWith("/send") ? { timeoutMs: 330000 } : {}),
      ...(body === undefined ? {} : { body }),
    });
  }
  async function load(id = network) {
    const result = await request<Workspace>(`/network/${id}`);
    setData(result);
    return result;
  }
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await work();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function stopMailing(id: string) {
    setStopping(true);
    try {
      await request(`/campaign/${id}/stop`, {});
      setNotice(
        "Stopp bestätigt. Keine weiteren Empfänger werden übergeben. Eine bereits laufende Übergabe wird noch beendet.",
      );
      await load();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Stopp konnte nicht bestätigt werden. Bitte erneut versuchen.",
      );
    } finally {
      setStopping(false);
    }
  }
  useEffect(() => {
    if (!network) return;
    let active = true;
    const timer = window.setInterval(() => {
      void request<Workspace>(`/network/${network}`)
        .then((result) => {
          if (active) setData(result);
        })
        .catch(() => {});
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [network]);
  useEffect(() => {
    const token = getPortalSession();
    if (!token) return;
    void portalRequest<Network[]>("/networks/admin", { token })
      .then((rows) => {
        setNetworks(rows);
        setNetwork(
          rows.find((n) => n.slug === "unternehmernetzwerkleverkusen")?.id ||
            rows[0]?.id ||
            "",
        );
      })
      .catch((e) => setNotice(e.message));
  }, []);
  useEffect(() => {
    if (!network) return;
    let active = true;
    setData(null);
    setSelected("");
    setRecipientListId("");
    setContactListId("");
    setListName("");
    setCsv([]);
    setConsentLead(null);
    setPreview(null);
    setSendConfirm(false);
    setEvents(null);
    void request<Workspace>(`/network/${network}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setDraft({ name: "", ...result.defaults });
      })
      .catch((e) => setNotice(e.message));
    return () => {
      active = false;
    };
  }, [network]);
  function choose(c?: Campaign) {
    setSelected(c?.id || "");
    setRecipientListId(c?.recipientListId || "");
    setDraft(
      c
        ? { name: c.name, subject: c.subject, body: c.body }
        : {
            name: "",
            subject: data?.defaults.subject || "",
            body: data?.defaults.body || "",
          },
    );
    setTab("campaigns");
  }
  function evidence() {
    return {
      tracking: tracking
        ? { at: new Date(trackAt).toISOString(), source: trackProof }
        : null,
    };
  }
  function resetEvidence(lead?: Lead) {
    setTracking(!!lead?.tracking);
    setTrackAt(lead?.tracking?.at.slice(0, 16) || "");
    setTrackProof(lead?.tracking?.source || "");
  }
  const evidenceForm = (
    <div className="mailingEvidence">
      <label className="mailingCheck">
        <input
          type="checkbox"
          checked={tracking}
          onChange={(e) => setTracking(e.target.checked)}
        />
        <span>Personenbezogenes Tracking aktivieren (optional)</span>
      </label>
      {tracking && (
        <div className="mailingPair">
          <label>
            Zeitpunkt
            <input
              required
              type="datetime-local"
              value={trackAt}
              onChange={(e) => setTrackAt(e.target.value)}
            />
          </label>
          <label>
            Nachweis / Quelle
            <input
              required
              minLength={5}
              value={trackProof}
              onChange={(e) => setTrackProof(e.target.value)}
            />
          </label>
        </div>
      )}
      <p>
        Ohne Trackingfreigabe werden keine persönlichen Öffnungs-, Klick- oder
        Registrierungsdaten erfasst. Zustimmungen können später ergänzt oder
        entfernt werden.
      </p>
    </div>
  );
  return (
    <section
      className="mailingsWorkspace"
      onClick={(event) => event.stopPropagation()}
      style={
        {
          "--mailing-accent": current?.primaryColor || "#5364d9",
        } as CSSProperties
      }
    >
      <div className="mailingNetworks" aria-label="Netzwerk auswählen">
        {networks.map((n) => (
          <button
            key={n.id}
            disabled={busy}
            aria-pressed={network === n.id}
            onClick={() => setNetwork(n.id)}
          >
            {n.logoUrl ? (
              <img src={n.logoUrl} alt="" />
            ) : (
              <span className="mailingInitial">{n.name.slice(0, 2)}</span>
            )}
            <span>{n.name}</span>
          </button>
        ))}
      </div>
      {notice && (
        <div role="status" className="mailingNotice">
          {notice}
        </div>
      )}
      {!data ? (
        <p>Mailing-Bereich wird geladen …</p>
      ) : (
        <>
          <div className="mailingHero">
            <div>
              <small>BETREIBER-WERKZEUG · {current?.name}</small>
              <h2>Aus Kontakten wird ein Netzwerk.</h2>
              <p>
                Mailings vorbereiten, Kontaktlisten verwalten und
                nachvollziehen, welche Wege zur Anmeldung führen.
              </p>
            </div>
            <div className="mailingTotals">
              <strong>{data.leads.length}</strong>
              <span>Kontakte</span>
              <strong>{data.campaigns.length}</strong>
              <span>Mailings</span>
            </div>
          </div>
          <div className="mailingCard" aria-label="Versandsteuerung">
            <h3>Versandsteuerung</h3>
            <p>
              Nach deiner Startfreigabe: automatisch bis zu 50 Mails alle 30
              Minuten, bis die Liste fertig ist oder du stoppst. Höchstens 100
              Mails pro 60 Minuten über alle Netzwerke hinweg, ohne zusätzliche
              Tagesgrenze. Bereits übergebene Mails können nicht zurückgerufen
              werden.
            </p>
            {data.campaigns
              .filter(
                (c) =>
                  c.id === selected ||
                  c.locked ||
                  c.automatic?.enabled ||
                  c.id === sendingId,
              )
              .map((c) => (
                <div key={c.id} className="mailingActions">
                  <strong>
                    {c.name} ·{" "}
                    {c.paused
                      ? "Gestoppt"
                      : c.locked || c.id === sendingId
                        ? "Versand läuft"
                        : c.automatic?.enabled
                          ? "Automatischer Versand aktiv"
                          : "Wartet auf Freigabe"}
                  </strong>
                  {c.automatic?.enabled && (
                    <span>Nächste Prüfung: {stamp(c.automatic.nextAt)}</span>
                  )}
                  {c.automatic?.lastError && (
                    <span>{c.automatic.lastError}</span>
                  )}
                  <button
                    type="button"
                    disabled={stopping || !!c.paused}
                    onClick={() => void stopMailing(c.id)}
                    style={{
                      background: "#b42318",
                      color: "#ffffff",
                      borderColor: "#b42318",
                    }}
                  >
                    {stopping
                      ? "Wird gestoppt …"
                      : c.paused
                        ? "Versand gestoppt"
                        : "Versand stoppen"}
                  </button>
                  {c.paused && (
                    <button
                      type="button"
                      disabled={busy || c.locked || c.id === sendingId}
                      onClick={() =>
                        void action(async () => {
                          await request(`/campaign/${c.id}/resume`, {});
                          await load();
                          setNotice(
                            "Mailing bereit. Bitte Text prüfen und den automatischen Versand erneut starten.",
                          );
                        })
                      }
                    >
                      Mailing wieder freigeben
                    </button>
                  )}
                </div>
              ))}
            {!selected &&
              !data.campaigns.some(
                (c) => c.locked || c.automatic?.enabled || c.id === sendingId,
              ) && <p>Wähle ein Mailing aus, um es zu stoppen.</p>}
          </div>
          <nav className="mailingTabs" aria-label="Mailing-Bereiche">
            {[
              ["campaigns", "Mailings & Entwürfe"],
              ["contacts", "Kontakte & Import"],
              ["reports", "Auswertung"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          {(!data.readiness.mail ||
            !data.readiness.tracking ||
            !data.readiness.deliveryWebhook) && (
            <div className="mailingReadiness">
              {!data.readiness.mail && (
                <p>
                  Versand noch nicht konfiguriert – Entwürfe und Kontakte können
                  vorbereitet werden.
                </p>
              )}
              {!data.readiness.tracking && (
                <p>
                  Die öffentliche Adresse für Tracking und Abmeldung muss vor
                  einem Versand eingerichtet werden.
                </p>
              )}
              {!data.readiness.deliveryWebhook && (
                <p>
                  Zustell- und Rückläufermeldungen sind noch nicht verbunden.
                  „Übergeben“ bedeutet nur: vom Versanddienst angenommen.
                </p>
              )}
            </div>
          )}
          {tab === "contacts" && (
            <>
              <form
                className="mailingCard"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    const result = await request<{
                      imported: number;
                      duplicate: number;
                      blocked: number;
                      issues: string[];
                      listId: string;
                      listName: string;
                    }>(`/network/${network}/import`, {
                      rows: csv,
                      source,
                      listName,
                      ...evidence(),
                    });
                    await load();
                    setCsv([]);
                    setContactListId(result.listId);
                    setNotice(
                      `Liste „${result.listName}“ angelegt: ${result.imported} neue Kontakte · ${result.duplicate} bereits vorhanden / doppelt · ${result.blocked} gesperrt. ${result.issues.slice(0, 5).join(" ")}`,
                    );
                  });
                }}
              >
                <h3>Kontakte importieren</h3>
                <p>
                  CSV mit E-Mail, Vorname, Nachname und Unternehmen. Maximal 500
                  Kontakte. Der Import versendet keine E-Mails.
                </p>
                <div className="mailingPair">
                  <label>
                    CSV-Datei
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void file
                            .text()
                            .then((text) => {
                              setCsv(parseMailingCsv(text));
                              setListName(file.name.replace(/\.csv$/i, ""));
                              setNotice("");
                            })
                            .catch((err) => setNotice(err.message));
                      }}
                    />
                  </label>
                  <label>
                    Name der neuen Kontaktliste
                    <input
                      required
                      maxLength={200}
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder="z. B. Köln · Unternehmen · Liste 2"
                    />
                  </label>
                  <label>
                    Herkunft der Kontaktliste
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="z. B. freigegebene Interessentenliste"
                    />
                  </label>
                </div>
                {csv.length > 0 && (
                  <div className="mailingImportPreview">
                    <strong>{csv.length} Kontakte zur Prüfung</strong>
                    {csv.slice(0, 4).map((r, i) => (
                      <p key={i}>
                        {r.email} · {r.company}
                      </p>
                    ))}
                  </div>
                )}
                {evidenceForm}
                <button
                  className="mailingPrimary"
                  disabled={busy || !csv.length}
                >
                  Kontakte übernehmen – noch nicht versenden
                </button>
              </form>
              <div className="mailingCard">
                <h3>Deine Kontaktlisten</h3>
                <div className="mailingListGrid">
                  {(data.lists || []).map((list) => (
                    <button
                      key={list.id}
                      className="mailingListTile"
                      aria-pressed={contactListId === list.id}
                      onClick={() => setContactListId(list.id)}
                    >
                      <strong>{list.name}</strong>
                      <span>{stamp(list.createdAt)}</span>
                      <span>
                        {list.total} Kontakte · {list.available} versendbar ·{" "}
                        {list.blocked} gesperrt
                      </span>
                    </button>
                  ))}
                </div>
                <label>
                  Kontaktliste anzeigen
                  <select
                    value={contactListId}
                    onChange={(e) => setContactListId(e.target.value)}
                  >
                    <option value="">
                      Alle Kontakte dieses Netzwerks ({data.leads.length})
                    </option>
                    {(data.lists || []).map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} · {stamp(list.createdAt)} · {list.total}{" "}
                        Kontakte
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {visibleLeads.length} Kontakte{" "}
                  {contactList ? `in „${contactList.name}“` : "insgesamt"}.
                  Abgemeldete Kontakte bleiben sichtbar, werden aber nicht
                  angeschrieben.
                </p>
                <div className="mailingTable">
                  <table>
                    <thead>
                      <tr>
                        <th>Kontakt</th>
                        <th>Versand</th>
                        <th>Tracking</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLeads.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <strong>
                              {l.firstName} {l.lastName}
                            </strong>
                            <br />
                            {l.email}
                            <br />
                            {l.company}
                          </td>
                          <td>
                            {l.suppressed
                              ? "Abgemeldet / gesperrt"
                              : "Versendbar"}
                          </td>
                          <td>
                            {l.tracking && !l.suppressed
                              ? "Freigegeben"
                              : "Aus"}
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                resetEvidence(l);
                                setConsentLead(l);
                              }}
                            >
                              Tracking
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Kontakt löschen und dauerhaft für weitere Werbe-Mailings sperren?",
                                  )
                                )
                                  void action(async () => {
                                    await request(`/lead/${l.id}/delete`, {});
                                    await load();
                                  });
                              }}
                            >
                              Löschen / sperren
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visibleLeads.length && (
                    <p>Keine Kontakte in dieser Auswahl.</p>
                  )}
                </div>
              </div>
            </>
          )}
          {tab === "campaigns" && (
            <div className="mailingColumns">
              <aside className="mailingCard">
                <h3>Deine Mailings</h3>
                <button onClick={() => choose()}>＋ Neues Mailing</button>
                {data.campaigns.map((c) => (
                  <button
                    className="mailingCampaign"
                    key={c.id}
                    aria-pressed={selected === c.id}
                    onClick={() => choose(c)}
                  >
                    <strong>{c.name}</strong>
                    <span>
                      {(data.lists || []).find(
                        (list) => list.id === c.recipientListId,
                      )?.name || "Noch keine Liste ausgewählt"}
                    </span>
                    <span>
                      {c.paused
                        ? "Gestoppt"
                        : c.locked
                          ? "Versand läuft"
                          : c.stats.submitted
                            ? "Fortsetzbar"
                            : "Entwurf"}{" "}
                      · {c.stats.submitted} übergeben
                    </span>
                  </button>
                ))}
              </aside>
              <form
                className="mailingCard"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    const result = await request<{ id: string }>(
                      `/network/${network}/campaign`,
                      {
                        ...draft,
                        recipientListId,
                        ...(campaign
                          ? { id: campaign.id, revision: campaign.revision }
                          : {}),
                      },
                    );
                    const fresh = await load();
                    choose(fresh.campaigns.find((c) => c.id === result.id));
                    setNotice(
                      "Änderungen gespeichert. Eine laufende Automatik wurde angehalten. Bitte vor dem Fortsetzen erneut prüfen und freigeben.",
                    );
                  });
                }}
              >
                <h3>
                  {campaign?.locked
                    ? "Gespeichertes Mailing"
                    : "Mailing gestalten"}
                </h3>
                <label>
                  Empfänger aus Kontaktliste
                  <select
                    required
                    value={recipientListId}
                    disabled={campaign?.locked || !!campaign?.stats.submitted}
                    onChange={(e) => setRecipientListId(e.target.value)}
                  >
                    <option value="">Bitte eine Liste auswählen</option>
                    {(data.lists || []).map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} · {stamp(list.createdAt)} · {list.total}{" "}
                        Kontakte
                      </option>
                    ))}
                  </select>
                </label>
                {selectedList ? (
                  <div className="mailingListSummary">
                    <strong>{selectedList.name}</strong>
                    <span>
                      {selectedList.total} Kontakte in dieser Liste ·{" "}
                      {selectedList.blocked} abgemeldet / gesperrt ·{" "}
                      {selectedList.available} versendbar
                    </span>
                    <span>
                      {listChanged
                        ? "Listenauswahl bitte speichern, bevor du den Versand prüfst."
                        : `${campaign?.eligible ?? selectedList.available} noch nicht in diesem Mailing angeschrieben.`}
                    </span>
                  </div>
                ) : (
                  <p>
                    Jedes Mailing verwendet genau eine Kontaktliste. Neue
                    Importe werden nicht automatisch hinzugefügt.
                  </p>
                )}
                {campaign && campaign.stats.submitted > 0 && (
                  <p>
                    Änderungen gelten nur für noch nicht angeschriebene
                    Empfänger. Beim Speichern wird eine aktive Automatik
                    angehalten. Bitte den neuen Text vor dem Fortsetzen erneut
                    freigeben.
                  </p>
                )}
                <label>
                  Interner Mailingname
                  <input
                    required
                    minLength={3}
                    maxLength={150}
                    disabled={campaign?.locked}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Betreff
                  <input
                    required
                    minLength={3}
                    maxLength={180}
                    disabled={campaign?.locked}
                    value={draft.subject}
                    onChange={(e) =>
                      setDraft({ ...draft, subject: e.target.value })
                    }
                  />
                </label>
                <label>
                  Mailtext
                  <textarea
                    required
                    minLength={30}
                    rows={16}
                    disabled={campaign?.locked}
                    value={draft.body}
                    onChange={(e) =>
                      setDraft({ ...draft, body: e.target.value })
                    }
                  />
                </label>
                <p>
                  Platzhalter:{" "}
                  {
                    "{{firstName}}, {{lastName}}, {{company}}, {{networkName}}, {{city}}"
                  }
                  . Der Ort wird aus Namen wie „Unternehmernetzwerk Köln“
                  erkannt. Mit **Text** kannst du einzelne Aussagen hervorheben.
                  Netzwerkname, Logo, Farben, Links und Abmeldung werden
                  automatisch ergänzt.
                </p>
                <div className="mailingActions">
                  {!campaign?.locked && (
                    <button
                      type="button"
                      disabled={busy || !data}
                      onClick={() => {
                        if (!data) return;
                        setDraft({ ...draft, ...data.defaults });
                        setNotice(
                          "Storytelling-Vorlage übernommen. Bitte prüfen und als Entwurf speichern.",
                        );
                      }}
                    >
                      Storytelling-Vorlage übernehmen
                    </button>
                  )}
                  {!campaign?.locked && (
                    <button className="mailingPrimary" disabled={busy}>
                      Änderungen speichern
                    </button>
                  )}
                  {campaign && (
                    <>
                      <button
                        type="button"
                        disabled={
                          busy ||
                          draft.name !== campaign.name ||
                          draft.subject !== campaign.subject ||
                          draft.body !== campaign.body ||
                          listChanged
                        }
                        onClick={() =>
                          void action(async () => {
                            const p = await request<{ html: string }>(
                              `/campaign/${campaign.id}/preview`,
                            );
                            setPreview(p.html);
                          })
                        }
                      >
                        Vorschau
                      </button>
                      <button
                        type="button"
                        disabled={
                          busy ||
                          !data.readiness.mail ||
                          draft.name !== campaign.name ||
                          draft.subject !== campaign.subject ||
                          draft.body !== campaign.body ||
                          listChanged
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              "Eine Testmail ausschließlich an deine Betreiberadresse senden?",
                            )
                          )
                            void action(async () => {
                              const r = await request<{ sentTo: string }>(
                                `/campaign/${campaign.id}/test`,
                                {},
                              );
                              setNotice(`Testmail an ${r.sentTo} übergeben.`);
                            });
                        }}
                      >
                        Test an mich
                      </button>
                      <button
                        type="button"
                        className="mailingPrimary"
                        disabled={
                          busy ||
                          campaign.paused ||
                          campaign.locked ||
                          campaign.automatic?.enabled ||
                          draft.name !== campaign.name ||
                          draft.subject !== campaign.subject ||
                          draft.body !== campaign.body ||
                          listChanged ||
                          !recipientListId ||
                          !campaign.eligible ||
                          !data.readiness.mail ||
                          !data.readiness.tracking
                        }
                        onClick={() => {
                          setConfirmName("");
                          setSendConfirm(true);
                        }}
                      >
                        Automatischen Versand prüfen ({campaign.eligible})
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}
          {tab === "reports" && (
            <div className="mailingCard">
              <h3>Mailing-Ergebnisse im Überblick</h3>
              <label>
                Mailing
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">Mailing auswählen</option>
                  {data.campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await load();
                  })
                }
              >
                Aktualisieren
              </button>
              <p className="mailingExplanation">
                Zustellung bedeutet: Der empfangende Mailserver hat die E-Mail
                angenommen, nicht zwingend der Posteingang. Bildabrufe sind
                keine sicheren Öffnungen. Mailprogramme, Bild-Proxys und
                Sicherheitsprüfungen können Aufrufe auslösen. Erkannte
                automatisierte Signale werden getrennt gezählt; nicht alle sind
                erkennbar. Eine Registrierung wird nur bei passender
                E-Mail-Adresse und im selben Netzwerk zugeordnet.
                Weitergeleitete Links erlauben keine sichere Personenzuordnung.
              </p>
              {campaign && (
                <>
                  <div className="mailingStats">
                    {[
                      ["Übergeben", campaign.stats.submitted, "all"],
                      [
                        "Zugestellt · Mailserver",
                        data.readiness.deliveryWebhook
                          ? campaign.stats.delivered
                          : "–",
                        "delivered",
                      ],
                      [
                        "Öffnungssignal",
                        measuredRecipients === 0
                          ? "–"
                          : (campaign.stats.opened ??
                            campaign.recipients.filter(
                              (r) => r.imageRequests > 0,
                            ).length),
                        "opened",
                      ],
                      [
                        "Kontakte mit Klick",
                        measuredRecipients === 0 ? "–" : campaign.stats.clicked,
                        "clicked",
                      ],
                      [
                        "Registriert",
                        measuredRecipients === 0
                          ? "–"
                          : campaign.stats.registered,
                        "registered",
                      ],
                      [
                        "Abgemeldet",
                        campaign.stats.unsubscribed ?? 0,
                        "unsubscribed",
                      ],
                    ].map(([label, count, filter]) => (
                      <button
                        type="button"
                        className={
                          reportFilter === filter
                            ? "reportStat selected"
                            : "reportStat"
                        }
                        key={label}
                        onClick={() => setReportFilter(String(filter))}
                      >
                        <strong>{count}</strong>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  {unmeasuredRecipients > 0 && (
                    <p className="mailingExplanation" role="status">
                      Bei {unmeasuredRecipients} von{" "}
                      {campaign.recipients.length} Empfängern ist keine
                      persönliche Messung nachweisbar aktiv. Öffnungen, Klicks
                      und zugeordnete Registrierungen sind dafür nicht
                      auswertbar – fehlende Messungen sind keine null
                      Reaktionen. Bereits ohne Tracking versendete E-Mails
                      können nachträglich nicht messbar gemacht werden.
                      Zustellmeldungen und Abmeldungen werden unabhängig davon
                      erfasst.
                    </p>
                  )}
                  {!data.readiness.deliveryWebhook && (
                    <p className="mailingExplanation">
                      Zustellrückmeldungen sind noch nicht verbunden. Fehlende
                      Rückmeldungen bedeuten nicht, dass die E-Mails
                      unzustellbar sind.
                    </p>
                  )}
                  <div className="mailingReportTools">
                    <label>
                      Kontakt suchen
                      <input
                        type="search"
                        placeholder="Unternehmen oder E-Mail-Adresse"
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                      />
                    </label>
                    <label>
                      Ergebnisse filtern
                      <select
                        value={reportFilter}
                        onChange={(e) => setReportFilter(e.target.value)}
                      >
                        <option value="all">Alle Kontakte</option>
                        <option value="delivered">Zugestellt</option>
                        <option value="opened">Mit Öffnungssignal</option>
                        <option value="clicked">Mit Linkklick</option>
                        <option value="registered">Registriert</option>
                        <option value="failed">Versandprobleme</option>
                        <option value="unsubscribed">Abgemeldet</option>
                      </select>
                    </label>
                  </div>
                  <div className="mailingTable mailingReportTable">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "Kontakt",
                            "Versandstatus",
                            "Öffnungssignal",
                            "Linkklicks",
                            "Registrierung",
                            "Verlauf",
                          ].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportRecipients
                          .slice(safeReportPage * 25, safeReportPage * 25 + 25)
                          .map((r) => (
                            <tr key={r.leadId}>
                              <td>
                                <strong>{r.company || r.email}</strong>
                                {r.company && <small>{r.email}</small>}
                              </td>
                              <td>
                                <span
                                  className={`mailingStatus ${r.bounced || r.dropped ? "bad" : r.delivered ? "good" : "pending"}`}
                                >
                                  {r.bounced
                                    ? "Unzustellbar"
                                    : r.dropped
                                      ? "Nicht versendet"
                                      : r.spamReported
                                        ? "Spam gemeldet"
                                        : r.delivered
                                          ? "Zugestellt"
                                          : r.deferred
                                            ? "Zustellung verzögert"
                                            : r.state === "submitted"
                                              ? "Übergeben · Rückmeldung offen"
                                              : "Versand unklar"}
                                </span>
                                <small>{stamp(r.submittedAt)}</small>
                                {r.unsubscribed && <small>Abgemeldet</small>}
                                {r.error && <p>{r.error}</p>}
                              </td>
                              <td>
                                {r.imageRequests > 0 ? (
                                  <span className="mailingStatus good">
                                    Signal erkannt · {r.imageRequests}
                                  </span>
                                ) : !measurable(r) ? (
                                  "Nicht erfasst"
                                ) : (
                                  "Kein Signal"
                                )}
                                {r.automatedSignals > 0 && (
                                  <small>
                                    {r.automatedSignals} automatische Signale
                                  </small>
                                )}
                              </td>
                              <td>
                                {!measurable(r) ? (
                                  "Nicht erfasst"
                                ) : (
                                  <div className="mailingClickChips">
                                    <span>
                                      Landingpage <b>{r.landingClicks}</b>
                                    </span>
                                    <span>
                                      Registrierung <b>{r.registerClicks}</b>
                                    </span>
                                    <span>
                                      Homepage <b>{r.homepageClicks}</b>
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td>
                                {r.verified
                                  ? "E-Mail bestätigt"
                                  : r.registered
                                    ? "Registriert"
                                    : !measurable(r)
                                      ? "Nicht zuordenbar"
                                      : "–"}
                              </td>
                              <td>
                                <button onClick={() => setEvents(r)}>
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {reportRecipients.length === 0 && (
                    <p>Keine passenden Kontakte gefunden.</p>
                  )}
                  <div className="mailingPagination">
                    <span>
                      {reportRecipients.length} Kontakte · Seite{" "}
                      {safeReportPage + 1} von {reportPages}
                    </span>
                    <div>
                      <button
                        disabled={safeReportPage === 0}
                        onClick={() => setReportPage(safeReportPage - 1)}
                      >
                        ← Zurück
                      </button>
                      <button
                        disabled={safeReportPage + 1 >= reportPages}
                        onClick={() => setReportPage(safeReportPage + 1)}
                      >
                        Weiter →
                      </button>
                    </div>
                  </div>
                  <p>
                    * Nur bei dokumentierter Trackingfreigabe. Signale sind
                    keine Messung von Aufenthaltsdauer oder sicherer
                    Lesebestätigung. „E-Mail bestätigt“ bedeutet noch keine
                    Freigabe als Netzwerkmitglied.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
      {(preview !== null || consentLead || events || sendConfirm) && (
        <div className="mailingOverlay" role="presentation">
          <section
            className="mailingModal"
            role="dialog"
            aria-modal="true"
            aria-label="Mailingdetails"
          >
            <button
              className="mailingClose"
              aria-label="Schließen"
              onClick={() => {
                setPreview(null);
                setConsentLead(null);
                setEvents(null);
                setSendConfirm(false);
              }}
            >
              ×
            </button>
            {preview !== null && (
              <>
                <h2>So sieht deine Mail aus</h2>
                <p>
                  Vorschau ohne personenbezogenes Tracking. Es wird nichts
                  versendet.
                </p>
                <iframe title="E-Mail-Vorschau" sandbox="" srcDoc={preview} />
              </>
            )}
            {consentLead && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    await request(
                      `/lead/${consentLead.id}/consent`,
                      evidence(),
                    );
                    await load();
                    setConsentLead(null);
                    setNotice("Tracking-Einstellungen gespeichert.");
                  });
                }}
              >
                <h2>Optionales Tracking</h2>
                <p>{consentLead.email}</p>
                {evidenceForm}
                <button className="mailingPrimary" disabled={busy}>
                  Speichern
                </button>
              </form>
            )}
            {events && (
              <>
                <h2>Signalverlauf</h2>
                <p>{events.email}</p>
                {events.events
                  .slice()
                  .reverse()
                  .map((e, i) => (
                    <p key={i}>
                      {stamp(e.at)} · {eventNames[e.kind] || e.kind}
                      {e.link ? ` · ${e.link}` : ""}
                      {e.automated ? " · automatisiert erkannt" : ""}
                    </p>
                  ))}
              </>
            )}
            {sendConfirm && campaign && (
              <>
                <h2>Automatischen Versand freigeben</h2>
                <p>
                  <strong>
                    {current?.name} · {campaign.name}
                  </strong>
                </p>
                <p>
                  Kontaktliste:{" "}
                  <strong>{selectedList?.name || "Keine ausgewählt"}</strong> ·{" "}
                  {selectedList?.total || 0} Kontakte insgesamt ·{" "}
                  {selectedList?.blocked || 0} gesperrt.
                </p>
                <p>
                  {campaign.eligible} versendbare Kontakte offen. Dieser Klick
                  startet den automatischen Versand: bis zu 50 Mails alle 30
                  Minuten, bis die ausgewählte Liste fertig ist oder du stoppst.
                  Insgesamt höchstens 100 Mails pro 60 Minuten über alle
                  Netzwerke hinweg, ohne zusätzliche Tagesgrenze. Später neu
                  importierte Empfänger benötigen eine neue Freigabe.
                  Abgemeldete und bereits angeschriebene Kontakte werden
                  übersprungen.
                </p>
                {pendingWithoutTracking > 0 && (
                  <p className="mailingExplanation" role="status">
                    Achtung: Für {pendingWithoutTracking} noch nicht
                    angeschriebene Kontakte ist Tracking ausgeschaltet. Diese
                    E-Mails werden ohne persönliche Öffnungs- und Klickmessung
                    versendet. Eine Trackingfreigabe muss vor dem Versand unter
                    „Kontakte & Import“ hinterlegt sein.
                  </p>
                )}
                <label>
                  Zur Bestätigung den Mailingnamen eingeben
                  <input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                  />
                </label>
                <button
                  className="mailingPrimary"
                  disabled={busy || confirmName !== campaign.name}
                  onClick={() =>
                    void action(async () => {
                      setSendConfirm(false);
                      setSendingId(campaign.id);
                      try {
                        const r = await request<{
                          automatic: boolean;
                          remaining: number;
                        }>(`/campaign/${campaign.id}/automatic`, {
                          confirmName,
                          revision: campaign.revision,
                          expectedCount: campaign.eligible,
                        });
                        await load();
                        setSendConfirm(false);
                        setNotice(
                          `Automatischer Versand gestartet: ${r.remaining} versendbare Kontakte. Du kannst jederzeit stoppen.`,
                        );
                      } finally {
                        setSendingId("");
                      }
                    })
                  }
                >
                  Automatischen Versand starten
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
