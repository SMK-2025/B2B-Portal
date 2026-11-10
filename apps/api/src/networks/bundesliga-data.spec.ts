import { describe, expect, it } from "vitest";
import {
  officialObjects,
  parseOfficialGames,
  parseOfficialRound,
  bundesligaSnapshot,
  parseOfficialTable,
} from "./bundesliga-data";
import { BUNDESLIGA_GAMES, BUNDESLIGA_TABLE } from "./bundesliga-schedule";
const page = (value: unknown) =>
  `<script id="ng-state" type="application/json">${JSON.stringify({ response: { b: value } })}</script>`;
describe("official Bundesliga data", () => {
  it("keeps the completed ninth matchday and matching standings available without a source fetch", () => {
    const snapshot = bundesligaSnapshot();
    expect(snapshot.round.day).toBe(9);
    expect(snapshot.round.games).toHaveLength(9);
    expect(snapshot.round.games.every((game) => game.homeScore !== null && game.awayScore !== null)).toBe(true);
    expect(snapshot.round.games.find((game) => game.away === "Bayer 04 Leverkusen")).toMatchObject({ homeScore: 1, awayScore: 2 });
    expect(snapshot.games[8]).toMatchObject({ officialGiantsScore: 2, officialOpponentScore: 1 });
    expect(snapshot.table.find((row) => row.team === "Bayer 04 Leverkusen")).toMatchObject({ rank: 5, played: 9, points: 16, goalsFor: 20, goalsAgainst: 17 });
    expect(snapshot.table.every((row) => row.played === 9)).toBe(true);
    expect(snapshot.table.reduce((sum, row) => sum + row.goalsFor - row.goalsAgainst, 0)).toBe(0);
  });
  it("selects only the requested full league round and does not invent a final score", () => {
    const games = bundesligaSnapshot().round.games.map((g, index) => ({
      dflDatalibraryCompetitionId: "DFL-COM-000001",
      dflDatalibrarySeasonId: "DFL-SEA-0001KA",
      matchday: 8,
      teams: { home: { nameFull: g.home }, away: { nameFull: g.away } },
      matchStatus:
        index && g.homeScore !== null ? "FINAL_WHISTLE" : "PRE_MATCH",
      matchDateFixed: true,
      plannedKickOff: g.kickoff,
      score: {
        home: { fulltime: g.homeScore },
        away: { fulltime: g.awayScore },
      },
    }));
    const rows = parseOfficialRound(
      page([...games, { ...games[0], matchday: 9 }]),
      8,
    );
    expect(rows).toHaveLength(9);
    expect(rows[0].homeScore).toBeNull();
    expect(rows.find((r) => r.home === "Borussia Dortmund")).toMatchObject({
      homeScore: 2,
      awayScore: 1,
    });
    expect(() => parseOfficialRound(page(games.slice(1)), 8)).toThrow();
  });
  it("reads all matchdays, UTC kickoffs, completed scores and provisional windows", () => {
    const html = page(
      BUNDESLIGA_GAMES.map((game) => ({
        dflDatalibraryCompetitionId: "DFL-COM-000001",
        dflDatalibrarySeasonId: "DFL-SEA-0001KA",
        matchday: game.matchday,
        matchDateFixed: game.kickoffConfirmed,
        plannedKickOff: game.startsAt,
        matchdayRange: {
          start: game.startsAt,
          end: game.dateWindowEnd || game.startsAt,
        },
        matchStatus:
          game.officialGiantsScore === null ? "PRE_MATCH" : "FINAL_WHISTLE",
        teams: {
          home: {
            threeLetterCode: game.home ? "B04" : "OPP",
            nameFull: game.home ? "Bayer 04 Leverkusen" : game.opponent,
          },
          away: {
            threeLetterCode: game.home ? "OPP" : "B04",
            nameFull: game.home ? game.opponent : "Bayer 04 Leverkusen",
          },
        },
        score: {
          home: {
            fulltime: game.home
              ? game.officialGiantsScore
              : game.officialOpponentScore,
          },
          away: {
            fulltime: game.home
              ? game.officialOpponentScore
              : game.officialGiantsScore,
          },
        },
      })),
    );
    const games = parseOfficialGames(html);
    expect(games).toHaveLength(34);
    expect(games[5]).toMatchObject({
      id: "bundesliga-2026-6",
      officialGiantsScore: 2,
      officialOpponentScore: 1,
    });
    expect(games[11]).toMatchObject({
      kickoffConfirmed: false,
      dateWindowEnd: "2026-12-06",
    });
    expect(games[6].startsAt).toBe("2026-10-25T14:30:00.000Z");
  });
  it("requires a complete mathematically consistent table with unique clubs", () => {
    const entries = BUNDESLIGA_TABLE.map((row) => ({
      club: { nameFull: row.team },
      rank: row.rank,
      gamesPlayed: row.played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      goalsScored: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      points: row.points,
    }));
    expect(parseOfficialTable(page({ entries }))).toEqual(BUNDESLIGA_TABLE);
    entries[0].points = 999;
    expect(() => parseOfficialTable(page({ entries }))).toThrow(
      /Unvollständige/,
    );
  });
  it("rejects changed, incomplete or executable source formats without evaluating scripts", () => {
    expect(() =>
      officialObjects('<script id="ng-state">process.exit()</script>'),
    ).toThrow();
    expect(() => parseOfficialGames(page([]))).toThrow(/Unvollständiger/);
    expect(() => parseOfficialTable(page([]))).toThrow(/Unvollständige/);
  });
});
