// Official league table, updated 31 October 2026 23:36, verified 1 November.
// Preserve the league's ranking (head-to-head tiebreaks), do not sort by difference.
export const PROB_TABLE_SOURCE =
  "https://www.2basketballbundesliga.de/tabelle-prob/";
export const PROB_AS_OF = "2026-10-31";
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
    ["Bayer Giants", "bayer-giants", 7, 6, 1, 12, 539, 487],
    ["TV Langen", "tv-langen", 5, 4, 1, 8, 370, 328],
    [
      "BG Hessing Leitershofen",
      "bg-hessing-leitershofen",
      6,
      4,
      2,
      8,
      440,
      415,
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
    ["Dresden Titans", "dresden-titans", 7, 5, 2, 10, 529, 495],
    ["SV Fellbach Flashers", "sv-fellbach-flashers", 6, 4, 2, 8, 494, 472],
    ["SKYLINERS Juniors", "skyliners-juniors", 5, 3, 2, 6, 431, 396],
    ["Dragons Rhöndorf", "dragons-rhoendorf", 7, 3, 4, 6, 542, 529],
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
const officialOrder = [
  "bayer-giants",
  "tsg-reutlingen-ravens",
  "dresden-titans",
  "tv-langen",
  "sv-fellbach-flashers",
  "bg-hessing-leitershofen",
  "tsv-oberhaching-tropics",
  "skyliners-juniors",
  "dragons-rhoendorf",
  "fc-bayern-basketball-ii",
  "culture-city-weimar",
  "bbc-coburg",
  "basketball-loewen",
  "porsche-bba-ludwigsburg",
  "ahorn-camp-baskets",
];
export const PROB_TABLE = [...rows]
  .sort((a, b) => officialOrder.indexOf(a[1]) - officialOrder.indexOf(b[1]))
  .map(
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
