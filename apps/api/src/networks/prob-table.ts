// Official ProB South table, updated 7 November 2026 23:44, verified 8 November.
// Preserve the league's ranking (head-to-head tiebreaks), do not sort by difference.
export const PROB_TABLE_SOURCE =
  "https://www.2basketballbundesliga.de/tabelle-prob-sued/";
export const PROB_AS_OF = "2026-11-08";
const rows: [string, string, number, number, number, number, number, number][] =
  [
    [
      "TSG Schöller SI Ravens Reutlingen",
      "tsg-reutlingen-ravens",
      7,
      7,
      0,
      14,
      595,
      461,
    ],
    ["Bayer Giants", "bayer-giants", 8, 7, 1, 14, 628, 547],
    ["TV Langen", "tv-langen", 7, 6, 1, 12, 530, 472],
    [
      "BG Hessing Leitershofen",
      "bg-hessing-leitershofen",
      7,
      4,
      3,
      8,
      512,
      490,
    ],
    [
      "TSV Oberhaching Tropics",
      "tsv-oberhaching-tropics",
      8,
      5,
      3,
      10,
      689,
      669,
    ],
    ["Dresden Titans", "dresden-titans", 7, 5, 2, 10, 529, 495],
    ["SV Fellbach Flashers", "sv-fellbach-flashers", 8, 6, 2, 12, 688, 601],
    ["SKYLINERS Juniors", "skyliners-juniors", 6, 3, 3, 6, 496, 475],
    ["Dragons Rhöndorf", "dragons-rhoendorf", 8, 3, 5, 6, 616, 612],
    [
      "FC Bayern Basketball II",
      "fc-bayern-basketball-ii",
      8,
      3,
      5,
      6,
      636,
      674,
    ],
    ["Culture City Weimar", "culture-city-weimar", 6, 1, 5, 2, 438, 501],
    ["BBC Coburg", "bbc-coburg", 7, 1, 6, 2, 475, 566],
    ["CATL Basketball Löwen Erfurt", "basketball-loewen", 6, 1, 5, 2, 430, 521],
    [
      "Porsche BBA Ludwigsburg",
      "porsche-bba-ludwigsburg",
      8,
      1,
      7,
      2,
      534,
      655,
    ],
    ["Ahorn Camp Baskets", "ahorn-camp-baskets", 7, 1, 6, 2, 479, 536],
  ];
const officialOrder = [
  "tsg-reutlingen-ravens",
  "bayer-giants",
  "tv-langen",
  "sv-fellbach-flashers",
  "dresden-titans",
  "tsv-oberhaching-tropics",
  "bg-hessing-leitershofen",
  "skyliners-juniors",
  "dragons-rhoendorf",
  "fc-bayern-basketball-ii",
  "culture-city-weimar",
  "basketball-loewen",
  "ahorn-camp-baskets",
  "bbc-coburg",
  "porsche-bba-ludwigsburg",
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
