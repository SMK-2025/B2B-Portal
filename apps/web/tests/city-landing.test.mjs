import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../src/app/' + path, import.meta.url), 'utf8');
const source = read('components/city-landing.tsx');
test('city landing pages share formal copy and the approved hero', () => {
  assert.match(source, /Eine Stadt voller/);
  assert.match(source, /Und Sie mittendrin/);
  assert.match(source, /Kontakte knüpfen/);
  assert.match(source, /Mitglieder-Chat direkt austauschen/);
  assert.doesNotMatch(source, /\b(?:du|Du|Dein|dein|deine|deiner|dich|euch)\b/u);
  assert.match(source, /<SiteFooter formal/);
  assert.match(source, /networkSlug=\{slug\}\s+formal/);
});
test('city branding, images and registration destinations remain isolated', () => {
  for (const [route, key] of [
    ['Koeln', 'koeln'],
    ['Leverkusen', 'leverkusen'],
  ]) {
    const page = read(`${route}/page.tsx`);
    assert.ok(page.includes(`cityKey="${key}"`));
    assert.ok(page.includes(`publishedMetadata("${key}")`));
    assert.ok(page.includes('PublishedMarketing'));
  }
  const published=read('components/published-marketing.tsx');
  assert.match(published,/city\.slug/);assert.match(published,/city\?\.route/);
  assert.match(source, /\/registrieren\?network=\$\{slug\}/);
  assert.match(source, /\$\{request\}&mode=login/);
  assert.match(source, /<LeverkusenOffer/);
});
