"use client";
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
type Game = {
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
};
type Schedule = {
  season: string;
  sourceUrl: string;
  canManage: boolean;
  games: Game[];
};

const defaultPrompt =
  "Was hat Ihnen sportlich und beim gemeinsamen Beisammensein gut gefallen? Welche Gespräche oder Kontakte sind entstanden – und was können wir beim nächsten Spiel sowie bei der Bekanntmachung im Netzwerk verbessern?";

const teamLogos: Record<string, string> = {
  "Ahorn Camp Baskets": "/network/bayer-giants/teams/ahorn-camp-baskets.png",
  "Bayer Giants": "/network/bayer-giants/teams/bayer-giants.png",
  "Bayer Giants Leverkusen": "/network/bayer-giants/teams/bayer-giants.png",
  "BBC Coburg": "/network/bayer-giants/teams/bbc-coburg.png",
  "BG Hessing Leitershofen": "/network/bayer-giants/teams/bg-hessing-leitershofen.png",
  "Basketball Löwen": "/network/bayer-giants/teams/basketball-loewen.png",
  "CATL Basketball Löwen": "/network/bayer-giants/teams/basketball-loewen.png",
  "Culture City Weimar": "/network/bayer-giants/teams/culture-city-weimar.png",
  "Dragons Rhöndorf": "/network/bayer-giants/teams/dragons-rhoendorf.png",
  "Dresden Titans": "/network/bayer-giants/teams/dresden-titans.png",
  "FC Bayern Basketball II": "/network/bayer-giants/teams/fc-bayern-basketball-ii.png",
  "Porsche BBA Ludwigsburg": "/network/bayer-giants/teams/porsche-bba-ludwigsburg.png",
  "SKYLINERS Juniors": "/network/bayer-giants/teams/skyliners-juniors.png",
  "SV Fellbach Flashers": "/network/bayer-giants/teams/sv-fellbach-flashers.png",
  "Fellbach Flashers": "/network/bayer-giants/teams/sv-fellbach-flashers.png",
  "TSG Reutlingen Ravens": "/network/bayer-giants/teams/tsg-reutlingen-ravens.png",
  "TSG Schöller SI Ravens Reutlingen": "/network/bayer-giants/teams/tsg-reutlingen-ravens.png",
  "TSV Oberhaching Tropics": "/network/bayer-giants/teams/tsv-oberhaching-tropics.png",
  "TV Langen": "/network/bayer-giants/teams/tv-langen.png",
};

function Team({ name }: { name: string }) {
  const logo = teamLogos[name];
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

export function NetworkGameScheduleWorkspace() {
  const access = useNetworkAccess(),
    networkId = access?.networkId || "",
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
        await portalRequest<Schedule>(`/networks/${networkId}/prob-schedule`, {
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
  }, [networkId]);
  const games = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return data.games
      .filter(
        (game) =>
          filter === "all" ||
          (filter === "results"
            ? game.homeScore !== null && game.awayScore !== null
            : Date.parse(game.startsAt) >= now && game.homeScore === null),
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
        `/networks/${networkId}/prob-schedule/${game.id}/result`,
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
        `/networks/${networkId}/prob-schedule/${game.id}/discussion`,
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
        `/networks/${networkId}/prob-schedule/${game.id}/discussion`,
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
        `/networks/${networkId}/prob-schedule/${game.id}/comments`,
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
        <p>{notice || "Der ProB-Spielplan wird geladen …"}</p>
      </section>
    );
  return (
    <div className="gameScheduleWorkspace">
      <section className="gameScheduleIntro">
        <div>
          <span>PROB SÜD · SAISON {data.season}</span>
          <h2>Gemeinsam mit den Giants durch die Saison</h2>
          <p>
            Alle Spiele, Ergebnisse und öffentlichen Partnergespräche an einem
            Ort. Diskutieren Sie sportliche Eindrücke, das gemeinsame
            Beisammensein und Ideen für ein noch stärkeres Netzwerk.
          </p>
        </div>
        <a href={data.sourceUrl} target="_blank" rel="noreferrer">
          Offizieller Spielplan ↗
        </a>
      </section>
      <nav className="gameScheduleFilters" aria-label="Spielplan filtern">
        <button
          className={filter === "upcoming" ? "active" : ""}
          onClick={() => setFilter("upcoming")}
        >
          Bevorstehende Spiele
        </button>
        <button
          className={filter === "results" ? "active" : ""}
          onClick={() => setFilter("results")}
        >
          Ergebnisse
        </button>
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Gesamter Spielplan
        </button>
      </nav>
      <section className="gameScheduleList">
        {games.map((game) => {
          const hasResult = game.homeScore !== null && game.awayScore !== null,
            isOpen = selected === game.id;
          return (
            <article key={game.id} className={isOpen ? "open" : ""}>
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
                  {new Date(game.startsAt).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
              <div className="gameMatch">
                <small>
                  {game.matchday}. SPIELTAG ·{" "}
                  {game.home ? "HEIMSPIEL" : "AUSWÄRTSSPIEL"}
                </small>
              <p>
                <Team name={game.homeTeam} />
                <span className="gameVersus">vs.</span>
                <Team name={game.awayTeam} />
              </p>
              </div>
              <div className="gameScore">
                {hasResult ? (
                  <>
                    <strong>
                      {game.homeScore}:{game.awayScore}
                    </strong>
                    <small>Endstand</small>
                  </>
                ) : (
                  <>
                    <strong>– : –</strong>
                    <small>noch offen</small>
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
                    Ergebnis pflegen
                  </button>
                )}
                {game.discussionOpen ? (
                  <button
                    className="discussion"
                    onClick={() => setSelected(isOpen ? null : game.id)}
                  >
                    Diskussion · {game.comments.length}
                  </button>
                ) : (
                  data.canManage && (
                    <button
                      className="discussion"
                      onClick={() => setDiscussionGame(game)}
                    >
                      Diskussion eröffnen
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
                    Giants
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
                  <button disabled={busy}>Ergebnis speichern</button>
                </form>
              )}
              {game.discussionOpen && isOpen && (
                <section className="gameDiscussion">
                  <header>
                    <div>
                      <span>ÖFFENTLICHE PARTNERRUNDE</span>
                      <h3>
                        Gemeinsam über das Spiel und das Netzwerk sprechen
                      </h3>
                    </div>
                    {data.canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void closeDiscussion(game)}
                      >
                        Diskussion schließen
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
                      <p>Noch keine Beiträge. Beginnen Sie den Austausch.</p>
                    )}
                  </div>
                  <form onSubmit={(event) => void addComment(event, game)}>
                    <label>
                      Ihr Beitrag
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
                      Beitrag veröffentlichen
                    </button>
                  </form>
                </section>
              )}
            </article>
          );
        })}
        {!games.length && (
          <div className="networkEmpty">
            <b>In dieser Ansicht sind keine Spiele vorhanden.</b>
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
                <span>PARTNERRUNDE</span>
                <h2>Diskussion für alle öffnen</h2>
              </div>
              <button onClick={() => setDiscussionGame(null)}>×</button>
            </header>
            <form
              onSubmit={(event) =>
                void configureDiscussion(event, discussionGame)
              }
            >
              <p>
                Alle eingetragenen Netzwerkpartner können die Beiträge sehen und
                sich beteiligen.
              </p>
              <label>
                Gesprächsimpuls
                <textarea
                  name="prompt"
                  rows={6}
                  defaultValue={defaultPrompt}
                  required
                />
              </label>
              <div className="gamePromptIdeas">
                <b>Mögliche Themen</b>
                <span>Sportliche Eindrücke</span>
                <span>Gemeinsames Beisammensein</span>
                <span>Entstandene Kontakte und Gespräche</span>
                <span>Verbesserungsideen</span>
                <span>Bekanntmachung der Partner im Netzwerk</span>
              </div>
              <div className="adminNetworkDialogActions">
                <button type="button" onClick={() => setDiscussionGame(null)}>
                  Abbrechen
                </button>
                <button className="networkPrimary" disabled={busy}>
                  Für alle Netzwerkpartner öffnen
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
