// Read-only rollout check. Intentional later operator price overrides may differ.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const api=process.argv[2]||'https://portalapi-production-c9ea.up.railway.app';
const cities=JSON.parse(await readFile(new URL('../apps/api/src/networks/city-networks.json',import.meta.url),'utf8'));
let checked=0;
for(let start=0;start<cities.length;start+=5) {
  await Promise.all(cities.slice(start,start+5).map(async city=>{
    const slug=`unternehmernetzwerk${city.key.replace(/-/g,'')}`;
    const response=await fetch(`${api}/api/networks/participation/quote/${slug}`);
    assert.equal(response.status,200,slug);
    const offer=await response.json();
    assert.equal(offer.monthlyNetCents,990,slug);
    assert.equal(offer.months,12,slug);
    assert.equal(offer.contribution?.minimumMonthlyNetCents,990,slug);
    assert.equal(offer.launchPromotion,null,slug);
    assert.equal(offer.termsVersion,'agb-2026-11-19',slug);
    checked++;
  }));
}
console.log(`PASS: ${checked} independent city offers: 990 cents net/month, 12 months, no active free launch offer.`);
