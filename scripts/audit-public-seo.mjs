import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://localhost:3009';
const paths=['/','/loesungen','/funktionen','/so-funktionierts','/sicherheit','/loesungen/wirtschaftsnetzwerke','/loesungen/verbaende','/loesungen/sport-und-sponsorennetzwerke','/loesungen/franchise-und-verbundgruppen','/loesungen/standort-und-wirtschaftsfoerderung','/loesungen/businessclubs-und-empfehlungsnetzwerke','/loesungen/partnerprogramme-und-oekosysteme'];
const titles=new Set();
paths.push('/impressum','/agb','/cookies','/barrierefreiheit','/datenschutz/unternehmen');
const links=new Set();
for(const path of paths){
 const response=await fetch(origin+path);assert.equal(response.status,200,path);
 const html=await response.text();
 assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,`one H1: ${path}`);
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1];assert(title,`title: ${path}`);assert(!titles.has(title),`unique title: ${path}`);titles.add(title);
 assert(/<meta name="description" content="[^"]+"/.test(html),`description: ${path}`);
 assert(html.includes('property="og:image" content="https://b2b-matching.de/markenbild"'),`butterfly share image: ${path}`);
 assert(html.includes('name="twitter:card" content="summary_large_image"'),`share card: ${path}`);
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];assert.equal(canonical?.replace(/\/$/,''),'https://b2b-matching.de'+(path==='/'?'':path),`canonical: ${path}`);
 for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))JSON.parse(match[1]);
 if(path.startsWith('/loesungen/'))assert(html.includes('BreadcrumbList')&&html.includes('FAQPage'),`structured data: ${path}`);
 for(const match of html.matchAll(/href="(\/[^"?#]*)"/g))if(!match[1].startsWith('/portal'))links.add(match[1]);
 console.log(`PASS ${path}`);
}
for(const path of links){const response=await fetch(origin+path);assert(response.status<400,`broken link ${path}: ${response.status}`);}
for(const path of ['/anmelden','/registrieren']){const response=await fetch(origin+path);assert(response.headers.get('x-robots-tag')?.includes('noindex'),`private indexing: ${path}`);}
const sitemap=await(await fetch(origin+'/sitemap.xml')).text();for(const path of paths)assert(sitemap.includes('https://b2b-matching.de'+(path==='/'?'':path)),`sitemap ${path}`);
assert(!sitemap.includes('/portal/'),'private URLs in sitemap');
const image=await fetch(origin+'/markenbild');assert.equal(image.status,200,'social image');assert(image.headers.get('content-type')?.includes('image/png'),'social image PNG');
console.log(`PASS: ${paths.length} pages, ${links.size} internal destinations, JSON-LD, sitemap and access-page indexing`);
