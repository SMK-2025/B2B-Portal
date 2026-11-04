"use client";
import { NetworkText } from "./network-text-editor";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { useNetworkAccess } from "./network-shell";

type Comment = {
  id: string;
  author: string;
  organization: string;
  body: string;
  createdAt: string;
};
export type Game = {
  id: string;
  matchday: number;
  startsAt: string;
  opponent: string;
  home: boolean;
  homeTeam: string;
  awayTeam: string;
  giantsScore: number | null;
  opponentScore: number | null;
  homeScore: number | null;
  awayScore: number | null;
  discussionOpen: boolean;
  discussionPrompt: string;
  comments: Comment[];
  dateWindowEnd?: string | null;
  kickoffConfirmed?: boolean;
};
export type Schedule = {
  round?: {
    day: number;
    asOf: string;
    url: string;
    games: {
      home: string;
      away: string;
      kickoff: string | null;
      homeScore: number | null;
      awayScore: number | null;
    }[];
  };
  season: string;
  sourceUrl: string;
  canManage: boolean;
  games: Game[];
  teamName: string;
  competition: string;
  logos: Record<string, string>;
  asOf: string | null;
  tableSourceUrl: string | null;
  table: {
    rank: number;
    team: string;
    logoUrl: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }[];
};

const defaultPrompt =
  "Was hat Ihnen sportlich und beim gemeinsamen Beisammensein gut gefallen? Welche Gespräche oder Kontakte sind entstanden – und was können wir beim nächsten Spiel sowie bei der Bekanntmachung im Netzwerk verbessern?";

const teamLogos: Record<string, string> = {
  "Ahorn Camp Baskets": "/network/bayer-giants/teams/ahorn-camp-baskets.png",
  "Bayer Giants": "/network/bayer-giants/teams/bayer-giants.png",
  "Bayer Giants Leverkusen": "/network/bayer-giants/teams/bayer-giants.png",
  "BBC Coburg": "/network/bayer-giants/teams/bbc-coburg.png",
  "BG Hessing Leitershofen":
    "/network/bayer-giants/teams/bg-hessing-leitershofen.png",
  "Basketball Löwen": "/network/bayer-giants/teams/basketball-loewen.png",
  "CATL Basketball Löwen": "/network/bayer-giants/teams/basketball-loewen.png",
  "CATL Basketball Löwen Erfurt":
    "/network/bayer-giants/teams/basketball-loewen.png",
  "Culture City Weimar": "/network/bayer-giants/teams/culture-city-weimar.png",
  "Dragons Rhöndorf": "/network/bayer-giants/teams/dragons-rhoendorf.png",
  "Dresden Titans": "/network/bayer-giants/teams/dresden-titans.png",
  "FC Bayern Basketball II":
    "/network/bayer-giants/teams/fc-bayern-basketball-ii.png",
  "Porsche BBA Ludwigsburg":
    "/network/bayer-giants/teams/porsche-bba-ludwigsburg.png",
  "SKYLINERS Juniors": "/network/bayer-giants/teams/skyliners-juniors.png",
  "SV Fellbach Flashers":
    "/network/bayer-giants/teams/sv-fellbach-flashers.png",
  "Fellbach Flashers": "/network/bayer-giants/teams/sv-fellbach-flashers.png",
  "TSG Reutlingen Ravens":
    "/network/bayer-giants/teams/tsg-reutlingen-ravens.png",
  "TSG Schöller SI Ravens Reutlingen":
    "/network/bayer-giants/teams/tsg-reutlingen-ravens.png",
  "TSV Oberhaching Tropics":
    "/network/bayer-giants/teams/tsv-oberhaching-tropics.png",
  "TV Langen": "/network/bayer-giants/teams/tv-langen.png",
};

export function Team({
  name,
  logos = {},
}: {
  name: string;
  logos?: Record<string, string>;
}) {
  const logo = logos[name] || teamLogos[name];
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <span className="gameTeam">
      <span className="gameTeamLogo">
        <span aria-hidden="true">{initials}</span>
        {logo && (
          <img
            src={logo}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
      <b>{name}</b>
    </span>
  );
}

function BundesligaTable({ data }: { data: Schedule }) {
  return (
    <section className="networkCard bundesligaTable" id="tabelle">
      <header>
        <div>
          <span>
            {data.competition} {data.season}
          </span>
          <h2>
            <NetworkText id="ui.network-game-schedule-workspace.e2144817d37c7a51">
              Die Tabelle im Überblick
            </NetworkText>
          </h2>
        </div>
        <a
          href={data.tableSourceUrl || data.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          <NetworkText id="ui.network-game-schedule-workspace.a56c57d99f01fc60">
            Offizielle Tabelle ↗
          </NetworkText>
        </a>
      </header>
      <p className="bundesligaSource">
        <NetworkText id="ui.network-game-schedule-workspace.2de251e0c4e8f819">
          Stand
        </NetworkText>{" "}
        {data.asOf &&
          new Date(`${data.asOf}T12:00:00Z`).toLocaleDateString("de-DE")}
        <NetworkText id="ui.network-game-schedule-workspace.11b0b4369087a4b2">
          . Offizieller Tabellenstand; manuell gepflegte Spielergebnisse
          verändern diese Tabelle nicht.
        </NetworkText>
      </p>
      <div
        className="bundesligaTableScroll"
        tabIndex={0}
        role="region"
        aria-label="Tabelle durchblättern"
      >
        <table>
          <caption className="sr-only">
            {data.competition}
            <NetworkText id="ui.network-game-schedule-workspace.f7d802ac557b2dc0">
              -Tabelle Saison{" "}
            </NetworkText>
            {data.season}
          </caption>
          <thead>
            <tr>
              <th>
                <NetworkText id="ui.network-game-schedule-workspace.9daead33c3e2331f">
                  Platz
                </NetworkText>
              </th>
              <th>
                <NetworkText id="ui.network-game-schedule-workspace.5423c9b192908354">
                  Verein
                </NetworkText>
              </th>
              <th>
                <NetworkText id="ui.network-game-schedule-workspace.84780e0aaa403d07">
                  Sp.
                </NetworkText>
              </th>
              <th>S</th>
              {data.competition === "Bundesliga" && <th>U</th>}
              <th>N</th>
              <th>
                <NetworkText id="ui.network-game-schedule-workspace.26e903d8edba9632">
                  {data.competition === "Bundesliga" ? "Tore" : "Körbe"}
                </NetworkText>
              </th>
              <th>
                <NetworkText id="ui.network-game-schedule-workspace.b48e2553e4e36740">
                  Diff.
                </NetworkText>
              </th>
              <th>
                <NetworkText id="ui.network-game-schedule-workspace.867ecbb11273a0c4">
                  Punkte
                </NetworkText>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.table.map((row) => (
              <tr
                key={row.team}
                className={row.team === data.teamName ? "highlight" : ""}
              >
                <td>{row.rank}</td>
                <th scope="row">
                  <Team name={row.team} logos={data.logos} />
                </th>
                <td>{row.played}</td>
                <td>{row.wins}</td>
                {data.competition === "Bundesliga" && <td>{row.draws}</td>}
                <td>{row.losses}</td>
                <td>
                  {row.goalsFor}:{row.goalsAgainst}
                </td>
                <td>{row.goalsFor - row.goalsAgainst}</td>
                <td>
                  <b>{row.points}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function NetworkGameScheduleWorkspace() {
  const access = useNetworkAccess(),
    networkId = access?.networkId || "",
    football = access?.slug === "bayer04leverkusen",
    endpoint = football ? "bundesliga-schedule" : "prob-schedule",
    [data, setData] = useState<Schedule | null>(null),
    [filter, setFilter] = useState<"upcoming" | "results" | "all">("upcoming"),
    [selected, setSelected] = useState<string | null>(null),
    [editResult, setEditResult] = useState<string | null>(null),
    [discussionGame, setDiscussionGame] = useState<Game | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const token = getPortalSession();
    if (!token || !networkId) return;
    try {
      setData(
        await portalRequest<Schedule>(`/networks/${networkId}/${endpoint}`, {
          token,
        }),
      );
      setNotice("");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Der Spielplan konnte nicht geladen werden.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, [networkId, endpoint]);
  useEffect(() => {
    if (!data) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    if (hash.startsWith("diskussion-")) {
      setFilter("all");
      setSelected(hash.slice("diskussion-".length));
    } else if (hash.startsWith("spiel-")) setFilter("all");
    const timer = window.setTimeout(
      () => document.getElementById(hash)?.scrollIntoView({ block: "start" }),
      100,
    );
    return () => window.clearTimeout(timer);
  }, [data]);
  const games = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return data.games
      .filter(
        (game) =>
          filter === "all" ||
          (filter === "results"
            ? game.homeScore !== null && game.awayScore !== null
            : Date.parse(
                game.dateWindowEnd
                  ? `${game.dateWindowEnd}T23:59:59Z`
                  : game.startsAt,
              ) >= now && game.homeScore === null),
      )
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }, [data, filter]);
  async function saveResult(event: FormEvent<HTMLFormElement>, game: Game) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${networkId}/${endpoint}/${game.id}/result`,
        {
          token,
          body: {
            giantsScore: form.get("giantsScore"),
            opponentScore: form.get("opponentScore"),
          },
        },
      );
      await load();
      setEditResult(null);
      setNotice("Das Ergebnis wurde gespeichert.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Das Ergebnis konnte nicht gespeichert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function clearResult(game: Game) {
    if (!window.confirm("Möchten Sie dieses Ergebnis wirklich löschen?"))
      return;
    const token = getPortalSession();
    if (!token) return;
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${networkId}/${endpoint}/${game.id}/result`,
        { token, body: { giantsScore: null, opponentScore: null } },
      );
      await load();
      setEditResult(null);
      setNotice("Das Ergebnis wurde gelöscht. Das Spiel ist wieder offen.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Das Ergebnis konnte nicht gelöscht werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function configureDiscussion(
    event: FormEvent<HTMLFormElement>,
    game: Game,
    open = true,
  ) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${networkId}/${endpoint}/${game.id}/discussion`,
        { token, body: { open, prompt: form.get("prompt") } },
      );
      await load();
      setSelected(game.id);
      setDiscussionGame(null);
      setNotice(
        open
          ? "Die Diskussionsrunde ist für alle Netzwerkpartner geöffnet."
          : "Die Diskussionsrunde wurde geschlossen.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Die Diskussionsrunde konnte nicht geändert werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function closeDiscussion(game: Game) {
    const token = getPortalSession();
    if (!token) return;
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${networkId}/${endpoint}/${game.id}/discussion`,
        {
          token,
          body: { open: false, prompt: game.discussionPrompt || defaultPrompt },
        },
      );
      await load();
      setSelected(null);
      setNotice("Die Diskussionsrunde wurde geschlossen.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Die Diskussionsrunde konnte nicht geschlossen werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addComment(event: FormEvent<HTMLFormElement>, game: Game) {
    event.preventDefault();
    const token = getPortalSession();
    if (!token) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    try {
      await portalRequest(
        `/networks/${networkId}/${endpoint}/${game.id}/comments`,
        { token, body: { body: data.get("body") } },
      );
      form.reset();
      await load();
      setSelected(game.id);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Der Beitrag konnte nicht veröffentlicht werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <section className="networkCard networkLoading">
        <p>{notice || "Der Spielplan wird geladen …"}</p>
      </section>
    );
  return (
    <div className="gameScheduleWorkspace">
      <section className="gameScheduleIntro">
        <div>
          <span>
            {data.competition}
            <NetworkText id="ui.network-game-schedule-workspace.c84610282e1fb9b4">
              · SAISON{" "}
            </NetworkText>
            {data.season}
          </span>
          <h2>
            <NetworkText id="ui.network-game-schedule-workspace.47c53b27b0f3dd5d">
              {football
                ? "Der Bundesliga-Spieltag im Überblick"
                : "Gemeinsam mit den Giants durch die Saison"}
            </NetworkText>
          </h2>
          <p>
            <NetworkText id="ui.network-game-schedule-workspace.9aa9ee414de93f6c">
              Spiele, Ergebnisse und Austausch im geschlossenen Partnernetzwerk.
              Teile deine Eindrücke und bleibe auch zwischen den Spieltagen in
              Kontakt.
            </NetworkText>
          </p>
        </div>
        <a href={data.sourceUrl} target="_blank" rel="noreferrer">
          <NetworkText id="ui.network-game-schedule-workspace.74a7703d5b0cd4fd">
            Offizieller Spielplan ↗
          </NetworkText>
        </a>
      </section>
      {football ? (
        <div className="bundesligaRoundPair">
          <section className="networkCard bundesligaRoundCard">
            <header>
              <div>
                <span>
                  <NetworkText id="ui.network-game-schedule-workspace.b43973380ed8e0d4">
                    Bundesliga ·{" "}
                  </NetworkText>
                  {data.season}
                </span>
                <h2>
                  {data.round
                    ? `${data.round.day}. Spieltag`
                    : "Spieltagsergebnisse"}
                </h2>
              </div>
              {data.round && (
                <a href={data.round.url} target="_blank" rel="noreferrer">
                  <NetworkText id="ui.network-game-schedule-workspace.18d7bddbe2a53972">
                    Offizieller Spieltag ↗
                  </NetworkText>
                </a>
              )}
            </header>
            {data.round ? (
              <>
                <p className="bundesligaSource">
                  <NetworkText id="ui.network-game-schedule-workspace.37325eebb7e934a5">
                    Alle Begegnungen · Stand
                  </NetworkText>{" "}
                  {new Date(data.round.asOf + "T12:00:00Z").toLocaleDateString(
                    "de-DE",
                  )}
                </p>
                <ul
                  className="bundesligaRoundGames"
                  tabIndex={0}
                  aria-label="Begegnungen des Spieltags"
                >
                  {data.round.games.map((g) => (
                    <li key={g.home}>
                      <Team name={g.home} logos={data.logos} />
                      <strong>
                        {g.homeScore !== null && g.awayScore !== null
                          ? `${g.homeScore} : ${g.awayScore}`
                          : g.kickoff
                            ? new Date(g.kickoff).toLocaleString("de-DE", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Europe/Berlin",
                              })
                            : "Termin offen"}
                      </strong>
                      <Team name={g.away} logos={data.logos} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="bundesligaSource">
                <NetworkText id="ui.network-game-schedule-workspace.3fd55ea47d5ef949">
                  Noch keine Spieltagsdaten verfügbar.
                </NetworkText>
              </p>
            )}
          </section>
          {data.table.length > 0 && <BundesligaTable data={data} />}
        </div>
      ) : (
        data.table.length > 0 && <BundesligaTable data={data} />
      )}
      <nav className="gameScheduleFilters" aria-label="Spielplan filtern">
        <button
          className={filter === "upcoming" ? "active" : ""}
          onClick={() => setFilter("upcoming")}
        >
          <NetworkText id="ui.network-game-schedule-workspace.04f6ec89c4a4b979">
            Bevorstehende Spiele
          </NetworkText>
        </button>
        <button
          className={filter === "results" ? "active" : ""}
          onClick={() => setFilter("results")}
        >
          <NetworkText id="ui.network-game-schedule-workspace.12ba6ae54b689292">
            Ergebnisse
          </NetworkText>
        </button>
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          <NetworkText id="ui.network-game-schedule-workspace.ce10369f0764805f">
            Gesamter Spielplan
          </NetworkText>
        </button>
      </nav>
      <section className="gameScheduleList">
        {games.map((game) => {
          const hasResult = game.homeScore !== null && game.awayScore !== null,
            isOpen = selected === game.id;
          return (
            <article
              key={game.id}
              id={`spiel-${game.id}`}
              className={isOpen ? "open" : ""}
            >
              <div className="gameDate">
                <strong>
                  {new Date(game.startsAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                  })}
                </strong>
                <span>
                  {new Date(game.startsAt).toLocaleDateString("de-DE", {
                    month: "short",
                  })}
                </span>
                <small>
                  {game.dateWindowEnd
                    ? `bis ${new Date(`${game.dateWindowEnd}T12:00:00Z`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`
                    : game.kickoffConfirmed === false
                      ? ""
                      : new Date(game.startsAt).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Berlin",
                        })}
                </small>
              </div>
              <div className="gameMatch">
                <small>
                  {game.matchday}
                  <NetworkText id="ui.network-game-schedule-workspace.9161c53fef831475">
                    . SPIELTAG ·
                  </NetworkText>{" "}
                  <NetworkText id="ui.network-game-schedule-workspace.8dc390e8800ccea2">
                    {game.home ? "HEIMSPIEL" : "AUSWÄRTSSPIEL"}
                  </NetworkText>
                  {game.dateWindowEnd && " · NOCH NICHT EXAKT TERMINIERT"}
                </small>
                <p>
                  <Team name={game.homeTeam} logos={data.logos} />
                  <span className="gameVersus">
                    <NetworkText id="ui.network-game-schedule-workspace.dbe6a873d506526f">
                      vs.
                    </NetworkText>
                  </span>
                  <Team name={game.awayTeam} logos={data.logos} />
                </p>
              </div>
              <div className="gameScore">
                {hasResult ? (
                  <>
                    <strong>
                      {game.homeScore}:{game.awayScore}
                    </strong>
                    <small>
                      <NetworkText id="ui.network-game-schedule-workspace.8f4026e4b9b4f408">
                        Endstand
                      </NetworkText>
                    </small>
                  </>
                ) : (
                  <>
                    <strong>– : –</strong>
                    <small>
                      <NetworkText id="ui.network-game-schedule-workspace.280216d3508df87a">
                        noch offen
                      </NetworkText>
                    </small>
                  </>
                )}
              </div>
              <div className="gameActions">
                {data.canManage && (
                  <button
                    onClick={() =>
                      setEditResult(editResult === game.id ? null : game.id)
                    }
                  >
                    <NetworkText id="ui.network-game-schedule-workspace.4ebaf30f974254e6">
                      Ergebnis pflegen
                    </NetworkText>
                  </button>
                )}
                {data.canManage && hasResult && (
                  <button
                    className="deleteResult"
                    disabled={busy}
                    onClick={() => void clearResult(game)}
                  >
                    <NetworkText id="ui.network-game-schedule-workspace.13a09ce50dabf839">
                      Ergebnis löschen
                    </NetworkText>
                  </button>
                )}
                {game.discussionOpen ? (
                  <button
                    className="discussion"
                    onClick={() => setSelected(isOpen ? null : game.id)}
                  >
                    <NetworkText id="ui.network-game-schedule-workspace.7198889e6b724165">
                      Diskussion ·{" "}
                    </NetworkText>
                    {game.comments.length}
                  </button>
                ) : (
                  data.canManage && (
                    <button
                      className="discussion"
                      onClick={() => setDiscussionGame(game)}
                    >
                      <NetworkText id="ui.network-game-schedule-workspace.7c8ca124586f148f">
                        Diskussion eröffnen
                      </NetworkText>
                    </button>
                  )
                )}
              </div>
              {editResult === game.id && (
                <form
                  className="gameResultForm"
                  onSubmit={(event) => void saveResult(event, game)}
                >
                  <label>
                    {data.teamName}
                    <input
                      name="giantsScore"
                      type="number"
                      min="0"
                      max="250"
                      defaultValue={game.giantsScore ?? ""}
                      required
                    />
                  </label>
                  <span>:</span>
                  <label>
                    {game.opponent}
                    <input
                      name="opponentScore"
                      type="number"
                      min="0"
                      max="250"
                      defaultValue={game.opponentScore ?? ""}
                      required
                    />
                  </label>
                  <button disabled={busy}>
                    <NetworkText id="ui.network-game-schedule-workspace.4a588183ebf1d043">
                      Ergebnis speichern
                    </NetworkText>
                  </button>
                </form>
              )}
              {game.discussionOpen && isOpen && (
                <section
                  className="gameDiscussion"
                  id={`diskussion-${game.id}`}
                >
                  <header>
                    <div>
                      <span>
                        <NetworkText id="ui.network-game-schedule-workspace.e17c19f5b646cf89">
                          OFFENE RUNDE IM GESCHLOSSENEN NETZWERK
                        </NetworkText>
                      </span>
                      <h3>
                        <NetworkText id="ui.network-game-schedule-workspace.a5ca5efc754440e9">
                          Gemeinsam über das Spiel und das Netzwerk sprechen
                        </NetworkText>
                      </h3>
                    </div>
                    {data.canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void closeDiscussion(game)}
                      >
                        <NetworkText id="ui.network-game-schedule-workspace.88e25147e232345a">
                          Diskussion schließen
                        </NetworkText>
                      </button>
                    )}
                  </header>
                  <p className="gamePrompt">
                    {game.discussionPrompt || defaultPrompt}
                  </p>
                  <div className="gameComments">
                    {game.comments.map((comment) => (
                      <article key={comment.id}>
                        <b>{comment.author}</b>
                        <small>
                          {comment.organization} ·{" "}
                          {new Date(comment.createdAt).toLocaleString("de-DE")}
                        </small>
                        <p>{comment.body}</p>
                      </article>
                    ))}
                    {!game.comments.length && (
                      <p>
                        <NetworkText id="ui.network-game-schedule-workspace.d371f14271f61b0a">
                          Noch keine Beiträge. Beginnen Sie den Austausch.
                        </NetworkText>
                      </p>
                    )}
                  </div>
                  <form onSubmit={(event) => void addComment(event, game)}>
                    <label>
                      <NetworkText id="ui.network-game-schedule-workspace.a2682adf81a10f18">
                        Ihr Beitrag
                      </NetworkText>
                      <textarea
                        name="body"
                        required
                        minLength={2}
                        maxLength={1500}
                        rows={4}
                        placeholder="Was hat Ihnen gefallen? Welche Begegnungen waren wertvoll? Was können wir verbessern?"
                      />
                    </label>
                    <button className="networkPrimary" disabled={busy}>
                      <NetworkText id="ui.network-game-schedule-workspace.e297d07afffd3d57">
                        Beitrag veröffentlichen
                      </NetworkText>
                    </button>
                  </form>
                </section>
              )}
            </article>
          );
        })}
        {!games.length && (
          <div className="networkEmpty">
            <b>
              <NetworkText id="ui.network-game-schedule-workspace.6082507c02dee4d5">
                In dieser Ansicht sind keine Spiele vorhanden.
              </NetworkText>
            </b>
          </div>
        )}
      </section>
      {discussionGame && (
        <div className="networkModalBackdrop">
          <section
            className="networkModal gameDiscussionModal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>
                  <NetworkText id="ui.network-game-schedule-workspace.92c39e888544227a">
                    PARTNERRUNDE
                  </NetworkText>
                </span>
                <h2>
                  <NetworkText id="ui.network-game-schedule-workspace.fe20351b2d07cef6">
                    Diskussion für alle öffnen
                  </NetworkText>
                </h2>
              </div>
              <button onClick={() => setDiscussionGame(null)}>×</button>
            </header>
            <form
              onSubmit={(event) =>
                void configureDiscussion(event, discussionGame)
              }
            >
              <p>
                <NetworkText id="ui.network-game-schedule-workspace.a56d63dec48ce831">
                  Alle eingetragenen Netzwerkpartner können die Beiträge sehen
                  und sich beteiligen.
                </NetworkText>
              </p>
              <label>
                <NetworkText id="ui.network-game-schedule-workspace.bdf9e8d31ec657a2">
                  Gesprächsimpuls
                </NetworkText>
                <textarea
                  name="prompt"
                  rows={6}
                  defaultValue={defaultPrompt}
                  required
                />
              </label>
              <div className="gamePromptIdeas">
                <b>
                  <NetworkText id="ui.network-game-schedule-workspace.3467f69af11b20fa">
                    Mögliche Themen
                  </NetworkText>
                </b>
                <span>
                  <NetworkText id="ui.network-game-schedule-workspace.91bd242b4ae74bae">
                    Sportliche Eindrücke
                  </NetworkText>
                </span>
                <span>
                  <NetworkText id="ui.network-game-schedule-workspace.7e9ac72247786508">
                    Gemeinsames Beisammensein
                  </NetworkText>
                </span>
                <span>
                  <NetworkText id="ui.network-game-schedule-workspace.ab24a0ee9fecc069">
                    Entstandene Kontakte und Gespräche
                  </NetworkText>
                </span>
                <span>
                  <NetworkText id="ui.network-game-schedule-workspace.515d260c1711de4e">
                    Verbesserungsideen
                  </NetworkText>
                </span>
                <span>
                  <NetworkText id="ui.network-game-schedule-workspace.175efbdf29d7ced0">
                    Bekanntmachung der Partner im Netzwerk
                  </NetworkText>
                </span>
              </div>
              <div className="adminNetworkDialogActions">
                <button type="button" onClick={() => setDiscussionGame(null)}>
                  <NetworkText id="ui.network-game-schedule-workspace.f7ff1178af202f6f">
                    Abbrechen
                  </NetworkText>
                </button>
                <button className="networkPrimary" disabled={busy}>
                  <NetworkText id="ui.network-game-schedule-workspace.46913c413fd787a1">
                    Für alle Netzwerkpartner öffnen
                  </NetworkText>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {notice && (
        <div className="networkNotice" role="status">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
    </div>
  );
}
