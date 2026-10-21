import type { ProBGame } from "./prob-schedule";

export const BUNDESLIGA_SEASON = "2026/27";
export const BUNDESLIGA_SOURCE =
  "https://www.bundesliga.com/de/bundesliga/spieltag/2026-2027/bayer-04-leverkusen";
export const BUNDESLIGA_TABLE_SOURCE =
  "https://www.bundesliga.com/de/bundesliga/tabelle";
export const BUNDESLIGA_AS_OF = "2026-10-21";
// Official Bundesliga snapshot, checked 21 October 2026. Dates without a kickoff
// remain matchday windows, never advertised as confirmed appointments.
const clubs = [
  ["FCB", "FC Bayern München", "00000G"],
  ["BVB", "Borussia Dortmund", "000007"],
  ["SCF", "Sport-Club Freiburg", "00000A"],
  ["B04", "Bayer 04 Leverkusen", "00000B"],
  ["M05", "1. FSV Mainz 05", "000006"],
  ["ELV", "SV Elversberg", "000N6L"],
  ["RBL", "RB Leipzig", "000017"],
  ["SVW", "SV Werder Bremen", "00000E"],
  ["HSV", "Hamburger SV", "00000C"],
  ["FCA", "FC Augsburg", "000010"],
  ["SGE", "Eintracht Frankfurt", "00000F"],
  ["KOE", "1. FC Köln", "000008"],
  ["VFB", "VfB Stuttgart", "00000D"],
  ["TSG", "TSG Hoffenheim", "000002"],
  ["S04", "FC Schalke 04", "000009"],
  ["SCP", "SC Paderborn 07", "00000L"],
  ["FCU", "1. FC Union Berlin", "00000V"],
  ["BMG", "Borussia Mönchengladbach", "000004"],
];
export const BUNDESLIGA_LOGOS = Object.fromEntries(
  clubs.map(([, name, id]) => [
    name,
    `https://assets.bundesliga.com/clublogos/DFL-SEA-0001KA/DFL-CLU-${id}.svg`,
  ]),
);
const name = (code: string) => clubs.find(([key]) => key === code)![1];
type Fixture = [string, string, boolean, number?, number?, string?];
const fixtures: Fixture[] = [
  ["2026-08-29", "ELV", false, 2, 3],
  ["2026-09-05", "FCU", true, 4, 0],
  ["2026-09-12", "FCA", false, 2, 2],
  ["2026-09-20", "RBL", true, 2, 0],
  ["2026-10-10", "M05", false, 4, 3],
  ["2026-10-18", "SCF", true, 2, 1],
  ["2026-10-25T14:30:00Z", "TSG", false],
  ["2026-10-31T14:30:00Z", "VFB", true],
  ["2026-11-08T14:30:00Z", "KOE", false],
  ["2026-11-21T14:30:00Z", "SCP", true],
  ["2026-11-29T18:30:00Z", "BVB", false],
  ["2026-12-04", "BMG", true, undefined, undefined, "2026-12-06"],
  ["2026-12-11", "SVW", false, undefined, undefined, "2026-12-13"],
  ["2026-12-18", "SGE", true, undefined, undefined, "2026-12-20"],
  ["2027-01-08", "HSV", false, undefined, undefined, "2027-01-10"],
  ["2027-01-12", "FCB", false, undefined, undefined, "2027-01-14"],
  ["2027-01-15", "S04", true, undefined, undefined, "2027-01-17"],
  ["2027-01-22", "ELV", true, undefined, undefined, "2027-01-24"],
  ["2027-01-29", "FCU", false, undefined, undefined, "2027-01-31"],
  ["2027-02-05", "FCA", true, undefined, undefined, "2027-02-07"],
  ["2027-02-12", "RBL", false, undefined, undefined, "2027-02-14"],
  ["2027-02-19", "M05", true, undefined, undefined, "2027-02-21"],
  ["2027-02-26", "SCF", false, undefined, undefined, "2027-02-28"],
  ["2027-03-02", "TSG", true, undefined, undefined, "2027-03-04"],
  ["2027-03-05", "VFB", false, undefined, undefined, "2027-03-07"],
  ["2027-03-12", "KOE", true, undefined, undefined, "2027-03-14"],
  ["2027-03-19", "SCP", false, undefined, undefined, "2027-03-21"],
  ["2027-04-02", "BVB", true, undefined, undefined, "2027-04-04"],
  ["2027-04-09", "BMG", false, undefined, undefined, "2027-04-11"],
  ["2027-04-16", "SVW", true, undefined, undefined, "2027-04-18"],
  ["2027-04-23", "SGE", false, undefined, undefined, "2027-04-25"],
  ["2027-05-07", "HSV", true, undefined, undefined, "2027-05-09"],
  ["2027-05-14", "FCB", true, undefined, undefined, "2027-05-16"],
  ["2027-05-22T13:30:00Z", "S04", false],
];
export type BundesligaGame = ProBGame & {
  dateWindowEnd: string | null;
  kickoffConfirmed: boolean;
};
export const BUNDESLIGA_GAMES: BundesligaGame[] = fixtures.map(
  ([date, code, home, score, opponentScore, end], index) => ({
    id: `bundesliga-2026-${index + 1}`,
    matchday: index + 1,
    startsAt: date.includes("T") ? date : `${date}T12:00:00Z`,
    dateWindowEnd: end || null,
    kickoffConfirmed: date.includes("T"),
    opponent: name(code),
    home,
    officialGiantsScore: score ?? null,
    officialOpponentScore: opponentScore ?? null,
  }),
);
const rows = [
  [4, 2, 0, 22, 5, 14],
  [4, 2, 0, 11, 4, 14],
  [4, 1, 1, 15, 6, 13],
  [4, 1, 1, 16, 9, 13],
  [3, 1, 2, 14, 10, 10],
  [3, 1, 2, 12, 11, 10],
  [3, 0, 3, 16, 11, 9],
  [2, 3, 1, 12, 12, 9],
  [3, 0, 3, 6, 15, 9],
  [2, 2, 2, 16, 12, 8],
  [2, 2, 2, 10, 16, 8],
  [2, 1, 3, 8, 11, 7],
  [2, 0, 4, 8, 10, 6],
  [2, 0, 4, 11, 14, 6],
  [1, 2, 3, 4, 7, 5],
  [1, 2, 3, 5, 9, 5],
  [1, 2, 3, 5, 17, 5],
  [0, 0, 6, 8, 20, 0],
];
export const BUNDESLIGA_TABLE = rows.map(
  ([wins, draws, losses, goalsFor, goalsAgainst, points], index) => ({
    rank: index + 1,
    team: clubs[index][1],
    logoUrl: BUNDESLIGA_LOGOS[clubs[index][1]],
    played: wins + draws + losses,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    points,
  }),
);
