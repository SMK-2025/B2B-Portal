import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../src/app/' + path, import.meta.url), 'utf8');
test('public header uses Login and Eigenes Portal on desktop and mobile', () => {
  const header = read('components/site-chrome.tsx').split('export function SiteFooter')[0];
  assert.equal((header.match(/publicLoginButton/g) || []).length, 2);
  assert.equal((header.match(/publicOwnPortalButton/g) || []).length, 2);
  assert.equal((header.match(/href=\{"\/eigenes-portal" as never\}/g) || []).length, 2);
  assert.doesNotMatch(header, /Partnerportal anmelden|Portal anfragen|mailto:/);
});
test('own portal landing covers member value, control, boundaries and contact', () => {
  const route = read('eigenes-portal/page.tsx');
  assert.match(route,/PublishedMarketing page="eigenes-portal"/);
  const page = read('components/marketing-info-page.tsx')+read('components/city-marketing.tsx');
  for (const copy of ['PagePilot AI', 'Mitglieder-Chat', 'Veranstaltungen', 'QR-Code', 'Dokumente', 'Angebote', 'Gesuche', 'Netzwerkleitung', 'Homepage', 'mailto:service@b2b-matching.de']) assert.ok(page.includes(copy), copy);
  assert.match(read('sitemap.ts'), /\/eigenes-portal/);
  assert.match(read('eigenes-portal/portal.css'), /max-width:\s*480px/);
});
