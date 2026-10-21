import { describe, expect, it } from "vitest";
import {
  officialObjects,
  parseOfficialGames,
  parseOfficialTable,
} from "./bundesliga-data";
import { BUNDESLIGA_GAMES, BUNDESLIGA_TABLE } from "./bundesliga-schedule";
const page = (value: unknown) =>
  `<script id="ng-state" type="application/json">${JSON.stringify({ response: { b: value } })}</script>`;
describe("official Bundesliga data", () => {
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
