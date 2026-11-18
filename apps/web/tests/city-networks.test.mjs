import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const cities=JSON.parse(readFileSync(new URL('../../api/src/networks/city-networks.json',import.meta.url),'utf8'));
test('50 unique city routes and network identifiers; preserve Cologne and Leverkusen',()=>{
  assert.equal(cities.length,50);
  assert.equal(new Set(cities.map(c=>c.key)).size,50);
  assert.equal(new Set(cities.map(c=>c.key.replaceAll('-',''))).size,50);
  for(const c of cities){assert.match(c.key,/^[a-z]+(?:-[a-z]+)*$/);assert.ok(c.region);assert.ok(c.city);}
  assert.equal(cities.find(c=>c.city==='Köln').key,'koeln');
  assert.equal(cities.find(c=>c.city==='Leverkusen').key,'leverkusen');
});
