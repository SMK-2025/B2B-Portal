import type { ProBGame } from "./prob-schedule";

export const BUNDESLIGA_SEASON = "2026/27";
export const BUNDESLIGA_SOURCE =
  "https://www.bundesliga.com/de/bundesliga/spieltag/2026-2027/bayer-04-leverkusen";
export const BUNDESLIGA_TABLE_SOURCE =
  "https://www.bundesliga.com/de/bundesliga/tabelle";
export const BUNDESLIGA_AS_OF = "2026-10-25";
// Official Bundesliga snapshot, checked 26 October 2026 after matchday 7. Dates without a kickoff
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
  ["2026-10-25T14:30:00Z", "TSG", false, 0, 3],
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
const standingsOrder = [
  "FCB",
  "BVB",
  "SCF",
  "B04",
  "RBL",
  "SVW",
  "M05",
  "ELV",
  "FCA",
  "TSG",
  "HSV",
  "KOE",
  "SCP",
  "SGE",
  "VFB",
  "S04",
  "FCU",
  "BMG",
];
const rows = [
  [5, 2, 0, 25, 6, 17],
  [5, 2, 0, 12, 4, 17],
  [4, 1, 2, 16, 9, 13],
  [4, 1, 2, 16, 12, 13],
  [4, 0, 3, 20, 11, 12],
  [3, 3, 1, 15, 14, 12],
  [3, 1, 3, 16, 13, 10],
  [3, 1, 3, 12, 15, 10],
  [2, 3, 2, 17, 13, 9],
  [3, 0, 4, 14, 14, 9],
  [3, 0, 4, 6, 16, 9],
  [2, 2, 3, 8, 11, 8],
  [2, 2, 3, 6, 9, 8],
  [2, 2, 3, 10, 17, 8],
  [2, 0, 5, 10, 13, 6],
  [1, 3, 3, 4, 7, 6],
  [1, 3, 3, 6, 18, 6],
  [1, 0, 6, 11, 22, 3],
];
export const BUNDESLIGA_TABLE = rows.map(
  ([wins, draws, losses, goalsFor, goalsAgainst, points], index) => ({
    rank: index + 1,
    team: name(standingsOrder[index]),
    logoUrl: BUNDESLIGA_LOGOS[name(standingsOrder[index])],
    played: wins + draws + losses,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    points,
  }),
);
