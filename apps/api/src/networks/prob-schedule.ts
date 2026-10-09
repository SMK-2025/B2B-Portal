export type ProBGame={id:string;matchday:number;startsAt:string;opponent:string;home:boolean;officialGiantsScore:number|null;officialOpponentScore:number|null};

export const PROB_SEASON="2026/27";
export const PROB_SOURCE_URL="https://www.giants-leverkusen.de/game-time/spielplan-ergebnisse/";

export const PROB_GAMES:ProBGame[]=[
 {id:"2026-09-27-oberhaching",matchday:1,startsAt:"2026-09-27T16:00:00+02:00",opponent:"TSV Oberhaching Tropics",home:false,officialGiantsScore:68,officialOpponentScore:86},
 {id:"2026-10-04-erfurt",matchday:2,startsAt:"2026-10-04T16:00:00+02:00",opponent:"CATL Basketball Löwen Erfurt",home:true,officialGiantsScore:88,officialOpponentScore:65},
 {id:"2026-10-11-weimar",matchday:3,startsAt:"2026-10-11T16:00:00+02:00",opponent:"Culture City Weimar",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-10-14-speyer",matchday:27,startsAt:"2026-10-14T19:30:00+02:00",opponent:"Ahorn Camp Baskets",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-10-18-coburg",matchday:4,startsAt:"2026-10-18T16:00:00+02:00",opponent:"BBC Coburg",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-10-24-bayern",matchday:5,startsAt:"2026-10-24T18:00:00+02:00",opponent:"FC Bayern Basketball II",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-10-31-rhoendorf",matchday:6,startsAt:"2026-10-31T19:00:00+01:00",opponent:"Dragons Rhöndorf",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-11-07-ludwigsburg",matchday:7,startsAt:"2026-11-07T18:00:00+01:00",opponent:"Porsche BBA Ludwigsburg",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-11-15-fellbach",matchday:9,startsAt:"2026-11-15T17:30:00+01:00",opponent:"SV Fellbach Flashers",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-11-22-leitershofen",matchday:10,startsAt:"2026-11-22T16:00:00+01:00",opponent:"BG Hessing Leitershofen",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-11-28-frankfurt",matchday:28,startsAt:"2026-11-28T19:00:00+01:00",opponent:"SKYLINERS Juniors",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-12-05-reutlingen",matchday:11,startsAt:"2026-12-05T18:00:00+01:00",opponent:"TSG Reutlingen Ravens",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-12-13-langen",matchday:12,startsAt:"2026-12-13T17:00:00+01:00",opponent:"TV Langen",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2026-12-20-dresden",matchday:13,startsAt:"2026-12-20T16:00:00+01:00",opponent:"Dresden Titans",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-01-03-coburg",matchday:14,startsAt:"2027-01-03T16:00:00+01:00",opponent:"BBC Coburg",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-01-09-bayern",matchday:15,startsAt:"2027-01-09T16:00:00+01:00",opponent:"FC Bayern Basketball II",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-01-17-fellbach",matchday:16,startsAt:"2027-01-17T16:00:00+01:00",opponent:"SV Fellbach Flashers",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-01-23-leitershofen",matchday:17,startsAt:"2027-01-23T19:30:00+01:00",opponent:"BG Hessing Leitershofen",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-01-27-frankfurt",matchday:29,startsAt:"2027-01-27T19:30:00+01:00",opponent:"SKYLINERS Juniors",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-01-31-ludwigsburg",matchday:18,startsAt:"2027-01-31T18:00:00+01:00",opponent:"Porsche BBA Ludwigsburg",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-02-06-langen",matchday:19,startsAt:"2027-02-06T19:30:00+01:00",opponent:"TV Langen",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-02-12-rhoendorf",matchday:20,startsAt:"2027-02-12T19:30:00+01:00",opponent:"Dragons Rhöndorf",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-02-20-reutlingen",matchday:21,startsAt:"2027-02-20T19:00:00+01:00",opponent:"TSG Reutlingen Ravens",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-02-27-oberhaching",matchday:30,startsAt:"2027-02-27T18:00:00+01:00",opponent:"TSV Oberhaching Tropics",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-03-07-erfurt",matchday:22,startsAt:"2027-03-07T17:00:00+01:00",opponent:"CATL Basketball Löwen Erfurt",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-03-14-dresden",matchday:23,startsAt:"2027-03-14T16:00:00+01:00",opponent:"Dresden Titans",home:true,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-03-21-speyer",matchday:24,startsAt:"2027-03-21T16:30:00+01:00",opponent:"Ahorn Camp Baskets",home:false,officialGiantsScore:null,officialOpponentScore:null},
 {id:"2027-04-03-weimar",matchday:26,startsAt:"2027-04-03T18:30:00+02:00",opponent:"Culture City Weimar",home:true,officialGiantsScore:null,officialOpponentScore:null}
];
