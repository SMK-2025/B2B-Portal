import { describe, it, expect } from "vitest";
import { PROB_GAMES } from "./prob-schedule";
import { PROB_TABLE, PROB_AS_OF } from "./prob-table";
import {
  BUNDESLIGA_GAMES,
  BUNDESLIGA_TABLE,
  BUNDESLIGA_AS_OF,
} from "./bundesliga-schedule";
import { bundesligaSnapshot } from "./bundesliga-data";
describe("verified sports snapshot 8 November 2026 before Sunday's games", () => {
  it("matches all eight Giants results to the official league table", () => {
    const completed = PROB_GAMES.filter((g) => g.officialGiantsScore !== null);
    expect(completed).toHaveLength(8);
    expect(completed.at(-1)).toMatchObject({
      opponent: "Porsche BBA Ludwigsburg",
      officialGiantsScore: 89,
      officialOpponentScore: 60,
    });
    const giants = PROB_TABLE.find((r) => r.team === "Bayer Giants")!;
    expect(giants).toMatchObject({
      rank: 2,
      played: 8,
      wins: 7,
      losses: 1,
      points: 14,
      goalsFor: 628,
      goalsAgainst: 547,
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
    expect(PROB_AS_OF).toBe("2026-11-08");
  });
  it("retains Leverkusen's eight final scores and keeps today's derby unplayed", () => {
    const games = BUNDESLIGA_GAMES.filter(
      (g) => g.officialGiantsScore !== null,
    );
    expect(games).toHaveLength(8);
    expect(games[7]).toMatchObject({
      opponent: "VfB Stuttgart",
      home: true,
      officialGiantsScore: 2,
      officialOpponentScore: 4,
    });
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
      rank: 6,
      played: 8,
      points: 13,
      goalsFor: 18,
      goalsAgainst: 16,
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
    expect(BUNDESLIGA_AS_OF).toBe("2026-11-08");
    expect(BUNDESLIGA_GAMES[8]).toMatchObject({
      opponent: "1. FC Köln",
      officialGiantsScore: null,
      officialOpponentScore: null,
    });
    expect(bundesligaSnapshot().round.day).toBe(9);
    expect(
      bundesligaSnapshot().round.games.filter((g) => g.homeScore !== null),
    ).toHaveLength(6);
    expect(
      BUNDESLIGA_TABLE.find((r) => r.team === "FC Bayern München"),
    ).toMatchObject({ played: 9, points: 21 });
    for (const row of BUNDESLIGA_TABLE) {
      expect(row.played).toBe(row.wins + row.draws + row.losses);
      expect(row.points).toBe(row.wins * 3 + row.draws);
    }
  });
});
