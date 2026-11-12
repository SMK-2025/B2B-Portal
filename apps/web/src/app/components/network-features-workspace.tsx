"use client";
import { useEffect, useState } from "react";
import { useNetworkAccess } from "./network-shell";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import "../network-features.css";
type Feature = {
  id: string;
  name: string;
  description: string;
  requires?: string;
};
type Config = {
  catalog: Feature[];
  enabled: Record<string, boolean>;
  defaults: Record<string, boolean>;
  configured: Record<string, boolean>;
  revision: number;
  sportSelection: string | null;
  sports: {
    id: string;
    sport: string;
    league: string;
    team: string;
    update: string;
  }[];
};
export function NetworkFeaturesWorkspace() {
  const access = useNetworkAccess();
  const [data, setData] = useState<Config | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [values, setValues] = useState<Record<string, boolean>>({}),
    [sport, setSport] = useState(""),
    [league, setLeague] = useState(""),
    [team, setTeam] = useState("");
  function accept(value: Config) {
    setData(value);
    setValues(
      Object.fromEntries(
        value.catalog.map((f) => [
          f.id,
          value.configured[f.id] ?? value.defaults[f.id],
        ]),
      ),
    );
    const selected = value.sports.find((s) => s.id === value.sportSelection);
    setSport(selected?.sport || "");
    setLeague(selected?.league || "");
    setTeam(selected?.id || "");
  }
  useEffect(() => {
    if (!access?.isInitiator) return;
    let active = true;
    portalRequest<Config>(`/networks/${access.networkId}/features`, {
      token: getPortalSession() || "",
    })
      .then((value) => {
        if (active) accept(value);
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [access?.networkId, access?.isInitiator]);
  if (!access?.isInitiator)
    return (
      <section className="networkCard">
        <p>Die Funktionsauswahl ist der Netzwerkleitung vorbehalten.</p>
      </section>
    );
  if (!data)
    return (
      <section className="networkCard">
        <p role="status">{message || "Funktionen werden geladen …"}</p>
      </section>
    );
  async function save() {
    if (!data || !access) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await portalRequest<Config>(
        `/networks/${access.networkId}/features`,
        {
          token: getPortalSession() || "",
          body: {
            revision: data.revision,
            features: values,
            ...(team ? { sportSelection: team } : {}),
          },
        },
      );
      accept(result);
      setMessage(
        "Die Funktionsauswahl wurde nur für dieses Netzwerk gespeichert.",
      );
      window.dispatchEvent(new Event("network-features-changed"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="networkFeatures">
      <div className="networkCard featureIntro">
        <h2>Ihr Netzwerk. Ihre Funktionen.</h2>
        <p>
          Alle Funktionen stehen Ihnen zur Verfügung. Schalten Sie ein, was Ihr
          Netzwerk nutzen soll. Beim Ausschalten bleiben bestehende Inhalte
          gespeichert. Preise und Mitgliedschaften ändern sich dadurch nicht.
        </p>
      </div>
      <div className="featureGrid">
        {data.catalog.map((f) => {
          const dependency =
            f.requires && data.catalog.find((other) => other.id === f.requires);
          const available = !f.requires || values[f.requires];
          return (
            <article className="networkCard featureCard" key={f.id}>
              <div>
                <h3 id={`feature-${f.id}`}>{f.name}</h3>
                <p>{f.description}</p>
                {dependency && (
                  <small>
                    Benötigt: {dependency.name}
                    {!available ? " (derzeit ausgeschaltet)" : ""}
                  </small>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={values[f.id] && !!available}
                aria-labelledby={`feature-${f.id}`}
                disabled={busy || !available}
                className="featureSwitch"
                onClick={() => setValues((v) => ({ ...v, [f.id]: !v[f.id] }))}
              >
                <span /> <b>{values[f.id] && available ? "An" : "Aus"}</b>
              </button>
              {f.id === "sports" && values.sports && (
                <div className="featureSports">
                  <label>
                    Sportart
                    <select
                      value={sport}
                      onChange={(e) => {
                        setSport(e.target.value);
                        setLeague("");
                        setTeam("");
                      }}
                    >
                      <option value="">Bitte auswählen</option>
                      {[...new Set(data.sports.map((s) => s.sport))].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Liga
                    <select
                      value={league}
                      disabled={!sport}
                      onChange={(e) => {
                        setLeague(e.target.value);
                        setTeam("");
                      }}
                    >
                      <option value="">Bitte auswählen</option>
                      {[
                        ...new Set(
                          data.sports
                            .filter((s) => s.sport === sport)
                            .map((s) => s.league),
                        ),
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Favoritenverein
                    <select
                      value={team}
                      disabled={!league}
                      onChange={(e) => setTeam(e.target.value)}
                    >
                      <option value="">Bitte auswählen</option>
                      {data.sports
                        .filter((s) => s.sport === sport && s.league === league)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.team}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p>
                    {data.sports.find((s) => s.id === team)?.update ||
                      "Angeboten werden die derzeit angebundenen Wettbewerbe und Vereine. Weitere Datenquellen müssen zuerst technisch angebunden werden."}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="networkCard featureSave">
        <p role="status">
          {message || "Änderungen werden erst mit dem Speichern wirksam."}
        </p>
        <button
          className="portalPrimary"
          type="button"
          disabled={busy || (values.sports && !team)}
          onClick={() => void save()}
        >
          {busy ? "Wird gespeichert …" : "Funktionsauswahl speichern"}
        </button>
      </div>
    </section>
  );
}
