"use client";
import "../network-pulse.css";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { ProfileDialog, type Member } from "./network-members-workspace";
export type ChatPulseState = {
  amountNet?: number;
  revision: number;
  stage: string;
  publicText: string;
  approvals: string[];
  hiddenBy: string[];
  history: { stage: string; comment: string; at: string }[];
};
const labels: Record<string, string> = {
  chat: "Im Gespräch",
  offer: "Angebot",
  negotiation: "Verhandlungen",
  accepted: "Kooperation vereinbart",
  declined: "Angebot abgelehnt",
};
type Entry = {
  id: string;
  stage: string;
  text: string;
  at: string;
  partners: {
    name: string;
    company: string;
    logoUrl: string | null;
    membershipId?: string;
  }[];
};
export function NetworkPulse() {
  const [profile, setProfile] = useState<Member | null>(null);
  async function openProfile(id?: string) {
    if (!id || !access?.networkId) return;
    try {
      const member = await portalRequest<Member>(
        `/networks/${access.networkId}/memberships/${encodeURIComponent(id)}`,
        { token: getPortalSession() || "" },
      );
      if (member.organization?.networkProfile?.status === "published")
        setProfile(member);
      else setError("Dieses Unternehmen hat noch keine veröffentlichte Seite.");
    } catch {
      setError("Die Unternehmensseite ist derzeit nicht verfügbar.");
    }
  }
  const access = useNetworkAccess(),
    [days, setDays] = useState(30),
    [entries, setEntries] = useState<Entry[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!access?.networkId) return;
    let active = true;
    setEntries([]);
    setError("");
    async function load() {
      try {
        const data = await portalRequest<Entry[]>(
          `/networks/${access!.networkId}/pulse?days=${days}`,
          { token: getPortalSession() || "" },
        );
        if (active) setEntries(data);
      } catch {
        if (active) setError("Der Netzwerk-Puls ist gerade nicht verfügbar.");
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [access?.networkId, days]);
  return (
    <section className="networkPulse networkCard">
      <header className="pulseHeading">
        <div>
          <small>GEMEINSAM MEHR ERREICHEN</small>
          <h2>Netzwerk-Puls</h2>
          <p>
            Hier kommen Mitglieder ins Gespräch und bringen Zusammenarbeit auf
            den Weg.
          </p>
        </div>
        <label>
          Zeitraum
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} Tage
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="pulseTimeline">
        {error ? (
          <p role="status">{error}</p>
        ) : entries.length ? (
          entries.map((item) => (
            <article key={item.id}>
              <span className="pulseBadge">{labels[item.stage]}</span>
              <div className="pulsePartners">
                {item.partners.map((p, i) => (
                  <span key={i}>
                    <button
                      className="pulseProfileButton"
                      onClick={() => void openProfile(p.membershipId)}
                    >
                      {p.logoUrl && <img src={p.logoUrl} alt="" />}
                      <strong>{p.company || p.name}</strong>
                    </button>
                    {i === 0 && <b> × </b>}
                  </span>
                ))}
              </div>
              {item.text && <p>{item.text}</p>}
              <time dateTime={item.at}>
                {new Date(item.at).toLocaleDateString("de-DE")}
              </time>
            </article>
          ))
        ) : (
          <p>
            Noch keine freigegebenen Aktivitäten in diesem Zeitraum. Ein guter
            Kontakt beginnt mit einem Gespräch.
          </p>
        )}
      </div>
      <small>
        Nur Status und gemeinsam freigegebene Beschreibungen – keine
        Chat-Inhalte.
      </small>
      {profile && (
        <ProfileDialog member={profile} onClose={() => setProfile(null)} />
      )}
    </section>
  );
}
