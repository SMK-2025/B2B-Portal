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
let snapshot = {
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
      snapshot = { games, table, asOf: now.slice(0, 10), fetchedAt: now };
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
