"use client";
import { NetworkText } from "./network-text-editor";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";
import { Team, type Schedule } from "./network-game-schedule-workspace";

export function NetworkMatchdayCard() {
  const access = useNetworkAccess();
  const football = access?.slug === "bayer04leverkusen";
  const [data, setData] = useState<Schedule | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const token = getPortalSession();
    if (!token || !access?.networkId) return;
    let active = true;
    portalRequest<Schedule>(
      `/networks/${access.networkId}/${football ? "bundesliga-schedule" : "prob-schedule"}`,
      { token },
    )
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active)
          setError("Spielinformationen konnten nicht geladen werden.");
      });
    return () => {
      active = false;
    };
  }, [access?.networkId, football]);
  const base = `/portal/netzwerk/${access?.slug}/spielplan`;
  const latest = data?.games
    .filter(
      (game) =>
        game.homeScore !== null &&
        game.awayScore !== null &&
        Date.parse(game.startsAt) <= Date.now(),
    )
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  const next = data?.games
    .filter(
      (game) =>
        game.homeScore === null &&
        Date.parse(
          game.dateWindowEnd
            ? `${game.dateWindowEnd}T23:59:59Z`
            : game.startsAt,
        ) >= Date.now(),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  return (
    <section className="networkCard bundesligaHomeCard">
      <header>
        <div>
          <span>
            {data?.competition || (football ? "Bundesliga" : "ProB Süd")} ·{" "}
            {data?.season || "2026/27"}
          </span>
          <h2>
            <NetworkText id="ui.network-bundesliga-card.380aed153b0ad93a">
              Nach dem Spiel ist vor dem Austausch
            </NetworkText>
          </h2>
        </div>
      </header>
      <div className="bundesligaHomeBody">
        {latest ? (
          <>
            <p className="bundesligaLastLabel">
              <NetworkText id="ui.network-bundesliga-card.e92cf2fc7055db59">
                Letztes Ergebnis ·{" "}
              </NetworkText>
              {latest.matchday}
              <NetworkText id="ui.network-bundesliga-card.725c3b7dfe2e070b">
                . Spieltag ·
              </NetworkText>{" "}
              {new Date(latest.startsAt).toLocaleDateString("de-DE")}
            </p>
            <div className="bundesligaLastResult">
              <Team name={latest.homeTeam} logos={data?.logos} />
              <strong>
                {latest.homeScore} : {latest.awayScore}
              </strong>
              <Team name={latest.awayTeam} logos={data?.logos} />
            </div>
            <p>
              <NetworkText id="ui.network-bundesliga-card.5c64694dda92c3b3">
                Wie hast du das Spiel erlebt? Teile deine Eindrücke mit den
                anderen Partnern.
              </NetworkText>
            </p>
          </>
        ) : (
          <p role="status">
            {error ||
              (data
                ? "Noch kein Ergebnis eingetragen."
                : "Spielinformationen werden geladen …")}
          </p>
        )}
        <div className="bundesligaHomeActions">
          {latest && (
            <Link
              className="networkPrimary"
              href={
                `${base}#${latest.discussionOpen ? "diskussion" : "spiel"}-${latest.id}` as never
              }
            >
              <NetworkText id="ui.network-bundesliga-card.b6f9bd98ec5c002c">
                {latest.discussionOpen
                  ? "Zur offenen Diskussionsrunde"
                  : "Zum Spiel und Austausch"}
              </NetworkText>
            </Link>
          )}
          {(football || Boolean(data?.table.length)) && (
            <Link href={`${base}#tabelle` as never}>
              <NetworkText id="ui.network-bundesliga-card.0beb2a15c66a12c8">
                Zur Tabelle
              </NetworkText>
            </Link>
          )}
          <Link href={`${base}${next ? `#spiel-${next.id}` : ""}` as never}>
            <NetworkText id="ui.network-bundesliga-card.6e13883273a7c6bd">
              Zum Spieltag
            </NetworkText>
            {next ? ` · ${next.matchday}` : ""}
          </Link>
        </div>
        {data?.asOf && (
          <small>
            <NetworkText id="ui.network-bundesliga-card.411cfff20a6d42c2">
              Spielplandaten: Stand
            </NetworkText>{" "}
            {new Date(`${data.asOf}T12:00:00Z`).toLocaleDateString("de-DE")}
            <NetworkText id="ui.network-bundesliga-card.9a89dc2a9353af60">
              · Ergebnisse durch die Netzwerkverwaltung ergänzbar.
            </NetworkText>
          </small>
        )}
      </div>
    </section>
  );
}
