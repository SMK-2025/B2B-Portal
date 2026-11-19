export type ContributionOffer={minimumMonthlyNetCents:number;selectedMonthlyNetCents:number;version:string};
export function validContributionCents(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const cents = Number(value);
  return Number.isSafeInteger(cents) && cents >= 990 && cents <= 100_000_000 ? cents : null;
}
export function contributionRegistrationHref(network: string, value: string, preview = false) {
  const cents = parseMonthlyContribution(value, 990);
  if (cents === null) return null;
  const params = new URLSearchParams({network, selectedMonthlyNetCents: String(cents)});
  if (preview) params.set("contributionPreview", "1");
  return `/registrieren?${params}`;
}
export function parseMonthlyContribution(value:string,minimum:number) {
  if(!/^\d{1,7}(?:[.,]\d{0,2})?$/.test(value.trim())) return null;
  const [whole,fraction=""]=value.trim().replace(",",".").split(".");
  const cents=Number(whole)*100+Number(fraction.padEnd(2,"0"));
  return Number.isSafeInteger(cents)&&cents>=minimum&&cents<=100_000_000?cents:null;
}
export function contributionTotals<T extends {monthlyNetCents:number;annualNetCents:number;vatCents:number;grossCents:number;months?:number;vatPercent?:number;contribution?:ContributionOffer}>(quote:T|null,cents:number|null):T|null {
  if(!quote?.contribution || cents===null) return quote;
  const annualNetCents=cents*(quote.months||12),vatCents=Math.round(annualNetCents*(quote.vatPercent??19)/100);
  return {...quote,monthlyNetCents:cents,annualNetCents,vatCents,grossCents:annualNetCents+vatCents,contribution:{...quote.contribution,selectedMonthlyNetCents:cents}};
}
