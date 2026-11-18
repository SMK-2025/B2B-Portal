import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCityPath} from '../src/app/lib/city-short-link.ts';
const cities=JSON.parse(readFileSync(new URL('../../api/src/networks/city-networks.json',import.meta.url),'utf8'));
test('short city addresses resolve all 50 catalog names and keys',()=>{
  for(const city of cities){assert.equal(normalizeCityPath(city.city),city.key);assert.equal(normalizeCityPath(city.key),city.key);}
  assert.equal(normalizeCityPath('MÜNCHEN'),'muenchen');
  assert.equal(normalizeCityPath('Bremen'),'bremen');
  assert.equal(normalizeCityPath('Bonn'),'bonn');
});
test('short addresses render landing content directly; no redirect instruction remains',()=>{
  const source=readFileSync(new URL('../src/app/[stadt]/page.tsx',import.meta.url),'utf8');
  const legacy=readFileSync(new URL('../src/app/netzwerke/[stadt]/page.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('return CityPage('));
  assert.ok(!/permanentRedirect\s*\(|\bredirect\s*\(/.test(source+legacy));
  for(const file of ['../src/app/lib/city-networks.ts','../../api/src/networks/city-networks.ts']){
    const catalog=readFileSync(new URL(file,import.meta.url),'utf8');
    assert.ok(!catalog.includes('`/netzwerke/${city.key}`'));
    assert.ok(catalog.includes('`/${city.key}`'));
  }
});
