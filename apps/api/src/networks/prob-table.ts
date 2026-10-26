// Official league table, updated 25 October 2026 20:33, verified 26 October.
// Preserve the league's ranking (head-to-head tiebreaks), do not sort by difference.
export const PROB_TABLE_SOURCE =
  "https://www.2basketballbundesliga.de/tabelle-prob-sued/";
export const PROB_AS_OF = "2026-10-25";
const rows: [string, string, number, number, number, number, number, number][] =
  [
    [
      "TSG Schöller SI Ravens Reutlingen",
      "tsg-reutlingen-ravens",
      5,
      5,
      0,
      10,
      433,
      322,
    ],
    ["Bayer Giants", "bayer-giants", 6, 5, 1, 10, 446, 409],
    ["TV Langen", "tv-langen", 5, 4, 1, 8, 370, 328],
    [
      "BG Hessing Leitershofen",
      "bg-hessing-leitershofen",
      5,
      4,
      1,
      8,
      367,
      338,
    ],
    [
      "TSV Oberhaching Tropics",
      "tsv-oberhaching-tropics",
      6,
      4,
      2,
      8,
      516,
      500,
    ],
    ["Dresden Titans", "dresden-titans", 6, 4, 2, 8, 452, 422],
    ["SV Fellbach Flashers", "sv-fellbach-flashers", 6, 4, 2, 8, 494, 472],
    ["SKYLINERS Juniors", "skyliners-juniors", 5, 3, 2, 6, 431, 396],
    ["Dragons Rhöndorf", "dragons-rhoendorf", 6, 3, 3, 6, 464, 436],
    [
      "FC Bayern Basketball II",
      "fc-bayern-basketball-ii",
      6,
      2,
      4,
      4,
      480,
      498,
    ],
    ["Culture City Weimar", "culture-city-weimar", 5, 1, 4, 2, 350, 407],
    ["BBC Coburg", "bbc-coburg", 6, 1, 5, 2, 403, 481],
    ["CATL Basketball Löwen Erfurt", "basketball-loewen", 6, 1, 5, 2, 430, 521],
    [
      "Porsche BBA Ludwigsburg",
      "porsche-bba-ludwigsburg",
      6,
      1,
      5,
      2,
      418,
      475,
    ],
    ["Ahorn Camp Baskets", "ahorn-camp-baskets", 5, 0, 5, 0, 325, 374],
  ];
export const PROB_TABLE = rows.map(
  (
    [team, logo, played, wins, losses, points, goalsFor, goalsAgainst],
    index,
  ) => ({
    rank: index + 1,
    team,
    logoUrl: `/network/bayer-giants/teams/${logo}.png`,
    played,
    wins,
    draws: 0,
    losses,
    points,
    goalsFor,
    goalsAgainst,
  }),
);
export const PROB_LOGOS = Object.fromEntries(
  PROB_TABLE.map((r) => [r.team, r.logoUrl]),
);
