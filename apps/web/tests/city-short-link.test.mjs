import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCityPath,cityLinkDestination} from '../src/app/lib/city-short-link.ts';
const cities=JSON.parse(readFileSync(new URL('../../api/src/networks/city-networks.json',import.meta.url),'utf8'));
test('short city addresses resolve all 50 catalog names and keys',()=>{
  for(const city of cities){assert.equal(normalizeCityPath(city.city),city.key);assert.equal(normalizeCityPath(city.key),city.key);}
  assert.equal(normalizeCityPath('MÜNCHEN'),'muenchen');
  assert.equal(normalizeCityPath('Bremen'),'bremen');
});
test('redirect retains mailing and repeated query parameters without external destinations',()=>{
  assert.equal(cityLinkDestination('/netzwerke/bremen',{utm_source:'mail',ref:['a','b'],empty:undefined}),'/netzwerke/bremen?utm_source=mail&ref=a&ref=b');
  assert.equal(cityLinkDestination('/netzwerke/muenchen',{}),'/netzwerke/muenchen');
  assert.equal(cityLinkDestination('/netzwerke/bremen',{next:'https://example.test'}),'/netzwerke/bremen?next=https%3A%2F%2Fexample.test');
});
