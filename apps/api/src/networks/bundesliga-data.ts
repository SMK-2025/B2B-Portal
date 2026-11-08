import {
  BUNDESLIGA_AS_OF,
  BUNDESLIGA_GAMES,
  BUNDESLIGA_LOGOS,
  BUNDESLIGA_SOURCE,
  BUNDESLIGA_TABLE,
  BUNDESLIGA_TABLE_SOURCE,
  type BundesligaGame,
} from "./bundesliga-schedule";

type JsonObject = Record<string, any>;
export function officialObjects(html: string): JsonObject[] {
  const script = html.match(
    /<script\b[^>]*\bid="ng-state"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!script || script[1].length > 8_000_000)
    throw new Error("Bundesliga-Datenformat nicht verfügbar");
  const root: unknown = JSON.parse(script[1]);
  const objects: JsonObject[] = [];
  function visit(value: unknown, depth: number) {
    if (depth > 30 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    objects.push(value as JsonObject);
    for (const item of Object.values(value)) visit(item, depth + 1);
  }
  visit(root, 0);
  return objects;
}
function integer(value: unknown, max = 1000): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= max
  );
}
export function parseOfficialGames(html: string): BundesligaGame[] {
  const games = new Map<number, BundesligaGame>();
  for (const item of officialObjects(html)) {
    if (
      item.dflDatalibraryCompetitionId !== "DFL-COM-000001" ||
      item.dflDatalibrarySeasonId !== "DFL-SEA-0001KA" ||
      !integer(item.matchday, 34) ||
      item.matchday < 1 ||
      !item.teams
    )
      continue;
    const home = item.teams.home?.threeLetterCode === "B04";
    if (!home && item.teams.away?.threeLetterCode !== "B04") continue;
    const opponent = (home ? item.teams.away : item.teams.home)?.nameFull;
    if (!(opponent in BUNDESLIGA_LOGOS)) continue;
    const confirmed = item.matchDateFixed === true;
    const date = confirmed ? item.plannedKickOff : item.matchdayRange?.start;
    if (typeof date !== "string" || !Number.isFinite(Date.parse(date)))
      continue;
    const completed = item.matchStatus === "FINAL_WHISTLE";
    const a = item.score?.home?.fulltime,
      b = item.score?.away?.fulltime;
    if (completed && (!integer(a, 250) || !integer(b, 250))) continue;
    games.set(item.matchday, {
      id: `bundesliga-2026-${item.matchday}`,
      matchday: item.matchday,
      startsAt: new Date(date).toISOString(),
      opponent,
      home,
      kickoffConfirmed: confirmed,
      dateWindowEnd:
        !confirmed && typeof item.matchdayRange?.end === "string"
          ? item.matchdayRange.end.slice(0, 10)
          : null,
      officialGiantsScore: completed ? (home ? a : b) : null,
      officialOpponentScore: completed ? (home ? b : a) : null,
    });
  }
  if (games.size !== 34)
    throw new Error("Unvollständiger Bundesliga-Spielplan");
  return [...games.values()].sort((a, b) => a.matchday - b.matchday);
}
export function parseOfficialTable(html: string): typeof BUNDESLIGA_TABLE {
  const rows = new Map<number, (typeof BUNDESLIGA_TABLE)[number]>();
  for (const item of officialObjects(html)) {
    const team = item.club?.nameFull;
    if (
      typeof team !== "string" ||
      !(team in BUNDESLIGA_LOGOS) ||
      !integer(item.rank, 18) ||
      item.rank < 1
    )
      continue;
    if (
      ![
        item.gamesPlayed,
        item.wins,
        item.draws,
        item.losses,
        item.goalsScored,
        item.goalsAgainst,
        item.points,
      ].every((value) => integer(value))
    )
      continue;
    if (
      item.gamesPlayed !== item.wins + item.draws + item.losses ||
      item.points !== item.wins * 3 + item.draws
    )
      continue;
    rows.set(item.rank, {
      rank: item.rank,
      team,
      logoUrl: BUNDESLIGA_LOGOS[team],
      played: item.gamesPlayed,
      wins: item.wins,
      draws: item.draws,
      losses: item.losses,
      goalsFor: item.goalsScored,
      goalsAgainst: item.goalsAgainst,
      points: item.points,
    });
  }
  if (
    rows.size !== 18 ||
    new Set([...rows.values()].map((row) => row.team)).size !== 18
  )
    throw new Error("Unvollständige Bundesliga-Tabelle");
  return [...rows.values()].sort((a, b) => a.rank - b.rank);
}
type ResultRow = {
  home: string;
  away: string;
  kickoff: string | null;
  homeScore: number | null;
  awayScore: number | null;
};
export function parseOfficialRound(html: string, day: number): ResultRow[] {
  const rows = new Map<string, ResultRow>();
  for (const i of officialObjects(html)) {
    if (
      i.matchday !== day ||
      i.dflDatalibraryCompetitionId !== "DFL-COM-000001" ||
      i.dflDatalibrarySeasonId !== "DFL-SEA-0001KA"
    )
      continue;
    const home = i.teams?.home?.nameFull,
      away = i.teams?.away?.nameFull;
    if (
      !Object.hasOwn(BUNDESLIGA_LOGOS, home) ||
      !Object.hasOwn(BUNDESLIGA_LOGOS, away)
    )
      continue;
    const final = i.matchStatus === "FINAL_WHISTLE",
      a = i.score?.home?.fulltime,
      b = i.score?.away?.fulltime;
    if (final && (!integer(a, 250) || !integer(b, 250))) continue;
    rows.set(home, {
      home,
      away,
      kickoff:
        i.matchDateFixed && Number.isFinite(Date.parse(i.plannedKickOff))
          ? new Date(i.plannedKickOff).toISOString()
          : null,
      homeScore: final ? a : null,
      awayScore: final ? b : null,
    });
  }
  const result = [...rows.values()];
  if (
    result.length !== 9 ||
    new Set(result.flatMap((row) => [row.home, row.away])).size !== 18
  )
    throw Error("Unvollständiger Bundesliga-Spieltag");
  return result.sort((a, b) =>
    (a.kickoff || "z").localeCompare(b.kickoff || "z"),
  );
}
const roundUrl = (day: number) =>
  `https://www.bundesliga.com/de/bundesliga/spieltag/2026-2027/${day}`;
let round = {
  day: 9,
  asOf: "2026-11-08",
  url: roundUrl(9),
  games: [
    {
      home: "Hamburger SV",
      away: "Borussia Mönchengladbach",
      kickoff: "2026-11-06T19:30:00.000Z",
      homeScore: 3,
      awayScore: 1,
    },
    {
      home: "Borussia Dortmund",
      away: "SV Elversberg",
      kickoff: "2026-11-07T14:30:00.000Z",
      homeScore: 2,
      awayScore: 1,
    },
    {
      home: "1. FSV Mainz 05",
      away: "FC Bayern München",
      kickoff: "2026-11-07T14:30:00.000Z",
      homeScore: 1,
      awayScore: 2,
    },
    {
      home: "SC Paderborn 07",
      away: "Eintracht Frankfurt",
      kickoff: "2026-11-07T14:30:00.000Z",
      homeScore: 2,
      awayScore: 2,
    },
    {
      home: "RB Leipzig",
      away: "FC Augsburg",
      kickoff: "2026-11-07T14:30:00.000Z",
      homeScore: 5,
      awayScore: 2,
    },
    {
      home: "VfB Stuttgart",
      away: "SV Werder Bremen",
      kickoff: "2026-11-07T17:30:00.000Z",
      homeScore: 1,
      awayScore: 0,
    },
    {
      home: "1. FC Köln",
      away: "Bayer 04 Leverkusen",
      kickoff: "2026-11-08T14:30:00.000Z",
      homeScore: null,
      awayScore: null,
    },
    {
      home: "Sport-Club Freiburg",
      away: "1. FC Union Berlin",
      kickoff: "2026-11-08T16:30:00.000Z",
      homeScore: null,
      awayScore: null,
    },
    {
      home: "TSG Hoffenheim",
      away: "FC Schalke 04",
      kickoff: "2026-11-08T18:30:00.000Z",
      homeScore: null,
      awayScore: null,
    },
  ] as ResultRow[],
};
let snapshot = {
  round,
  games: BUNDESLIGA_GAMES,
  table: BUNDESLIGA_TABLE,
  asOf: BUNDESLIGA_AS_OF,
  fetchedAt: null as string | null,
};
let nextRefresh = 0;
let pending: Promise<void> | null = null;
export const bundesligaSnapshot = () => snapshot;
async function officialHtml(url: string) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(6000),
    headers: { Accept: "text/html" },
  });
  if (!response.ok) throw new Error("Bundesliga-Quelle nicht erreichbar");
  const html = await response.text();
  if (html.length > 8_000_000) throw new Error("Bundesliga-Antwort zu groß");
  return html;
}
export async function refreshBundesliga() {
  if (pending) return pending;
  if (Date.now() < nextRefresh) return;
  pending = (async () => {
    try {
      const [gamesHtml, tableHtml] = await Promise.all([
        officialHtml(BUNDESLIGA_SOURCE),
        officialHtml(BUNDESLIGA_TABLE_SOURCE),
      ]);
      const games = parseOfficialGames(gamesHtml),
        table = parseOfficialTable(tableHtml),
        now = new Date().toISOString();
      if (
        games.filter((g) => g.officialGiantsScore !== null).length <
          snapshot.games.filter((g) => g.officialGiantsScore !== null).length ||
        table.reduce((sum, r) => sum + r.played, 0) <
          snapshot.table.reduce((sum, r) => sum + r.played, 0)
      )
        throw new Error("Veralteter Bundesliga-Quellstand");
      const last = Math.max(
        1,
        ...games
          .filter((g) => g.officialGiantsScore !== null)
          .map((g) => g.matchday),
      );
      const candidate = Math.max(
        last,
        round.day,
        ...officialObjects(gamesHtml)
          .filter(
            (i) =>
              i.dflDatalibraryCompetitionId === "DFL-COM-000001" &&
              i.dflDatalibrarySeasonId === "DFL-SEA-0001KA" &&
              integer(i.matchday, 34) &&
              Date.parse(i.matchdayRange?.start) <= Date.now(),
          )
          .map((i) => i.matchday),
      );
      try {
        const rows = parseOfficialRound(
          await officialHtml(roundUrl(candidate)),
          candidate,
        );
        if (
          candidate > round.day ||
          rows.filter((g) => g.homeScore !== null).length >=
            round.games.filter((g) => g.homeScore !== null).length
        )
          round = {
            day: candidate,
            asOf: now.slice(0, 10),
            url: roundUrl(candidate),
            games: rows,
          };
      } catch {
        /* Keep the last complete round and its own timestamp. */
      }
      snapshot = {
        round,
        games,
        table,
        asOf: now.slice(0, 10),
        fetchedAt: now,
      };
      nextRefresh = Date.now() + 15 * 60_000;
    } catch {
      // Keep last verified data, including its original timestamp. Never invent results.
      nextRefresh = Date.now() + 60_000;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
