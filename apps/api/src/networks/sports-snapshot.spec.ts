import { describe, it, expect } from "vitest";
import { PROB_GAMES } from "./prob-schedule";
import { PROB_TABLE, PROB_AS_OF } from "./prob-table";
import { BUNDESLIGA_GAMES, BUNDESLIGA_TABLE } from "./bundesliga-schedule";
describe("verified sports snapshot 26 October 2026", () => {
  it("matches all six Giants results to the official league table", () => {
    const completed = PROB_GAMES.filter((g) => g.officialGiantsScore !== null);
    expect(completed).toHaveLength(6);
    const giants = PROB_TABLE.find((r) => r.team === "Bayer Giants")!;
    expect(giants).toMatchObject({
      rank: 2,
      played: 6,
      wins: 5,
      losses: 1,
      points: 10,
      goalsFor: 446,
      goalsAgainst: 409,
    });
    expect(completed.reduce((s, g) => s + g.officialGiantsScore!, 0)).toBe(
      giants.goalsFor,
    );
    expect(completed.reduce((s, g) => s + g.officialOpponentScore!, 0)).toBe(
      giants.goalsAgainst,
    );
    expect(PROB_TABLE).toHaveLength(15);
    expect(new Set(PROB_TABLE.map((r) => r.team)).size).toBe(15);
    for (const r of PROB_TABLE) {
      expect(r.played).toBe(r.wins + r.losses);
      expect(r.points).toBe(r.wins * 2);
    }
    expect(PROB_AS_OF).toBe("2026-10-25");
  });
  it("matches Leverkusen's Hoffenheim result and seven matches to the official table", () => {
    const games = BUNDESLIGA_GAMES.filter(
      (g) => g.officialGiantsScore !== null,
    );
    expect(games).toHaveLength(7);
    expect(games[6]).toMatchObject({
      opponent: "TSG Hoffenheim",
      home: false,
      officialGiantsScore: 0,
      officialOpponentScore: 3,
    });
    const team = BUNDESLIGA_TABLE.find(
      (r) => r.team === "Bayer 04 Leverkusen",
    )!;
    expect(team).toMatchObject({
      rank: 4,
      played: 7,
      points: 13,
      goalsFor: 16,
      goalsAgainst: 12,
    });
    expect(games.reduce((s, g) => s + g.officialGiantsScore!, 0)).toBe(
      team.goalsFor,
    );
    expect(games.reduce((s, g) => s + g.officialOpponentScore!, 0)).toBe(
      team.goalsAgainst,
    );
    expect(BUNDESLIGA_TABLE.reduce((s, r) => s + r.goalsFor, 0)).toBe(
      BUNDESLIGA_TABLE.reduce((s, r) => s + r.goalsAgainst, 0),
    );
  });
});
