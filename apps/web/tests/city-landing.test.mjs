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
  for (const [route, slug, color, image] of [
    ['Koeln', 'unternehmernetzwerkkoeln', '#c8102e', 'koeln-network-blue-hour.webp'],
    ['Leverkusen', 'unternehmernetzwerkleverkusen', '#0723f2', 'leverkusen-network-blue-hour-v2.webp'],
  ]) {
    const page = read(`${route}/page.tsx`);
    assert.ok(page.includes(`slug="${slug}"`));
    assert.ok(page.includes(`primary="${color}"`));
    assert.ok(page.includes(image));
    assert.ok(page.includes(`canonical: "/${route}"`));
  }
  assert.match(source, /\/registrieren\?network=\$\{slug\}/);
  assert.match(source, /\$\{request\}&mode=login/);
  assert.match(source, /<LeverkusenOffer/);
});
