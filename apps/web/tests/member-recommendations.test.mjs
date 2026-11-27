import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('recommendation entry point and structured message cards are integrated into the shared chat',()=>{
  const chat=read('../src/app/components/partner-chat-workspace.tsx');
  assert.match(chat,/<RecommendationButton/);assert.match(chat,/<RecommendationCard/);
  assert.match(chat,/recommendationId/);assert.match(chat,/data\.recommendations/);
  const ui=read('../src/app/components/member-recommendations.tsx');
  for(const value of ['Unternehmen','Ansprechpartner','E-Mail-Adresse','Rufnummer','Worum geht es?','Empfehlung öffnen','sharingConfirmed'])assert.ok(ui.includes(value));
  assert.match(ui,/entry\.recipientId === access\?\.currentUserId/);
  assert.match(ui,/features\?\.recommendations/);
  assert.match(ui,/revision: entry\.revision/);
});
test('initiator recommendations route, restricted report and public pulse label are available across networks',()=>{
  assert.match(read('../src/app/portal/netzwerk/[slug]/[bereich]/page.tsx'),/RecommendationsOverview/);
  const shell=read('../src/app/components/network-shell.tsx');assert.match(shell,/path: "empfehlungen"/);assert.match(shell,/item\.path !== 'empfehlungen' \|\| access\.isInitiator/);
  const ui=read('../src/app/components/member-recommendations.tsx');assert.match(ui,/!access\?\.isInitiator/);assert.ok(ui.includes('Ohne Rückmeldung'));
  assert.match(read('../src/app/components/network-pulse.tsx'),/recommendation: "Empfehlung ausgesprochen"/);
});
test('recommendation sharing is explained without changing archived privacy versions',()=>{
  assert.match(read('../src/app/datenschutz/unternehmen/page.tsx'),/current recommendationsEnabled/);
  const privacy=read('../src/app/components/legal-privacy.tsx');assert.match(privacy,/recommendationsEnabled&&<LegalSection title="Empfehlungen zwischen Mitgliedern"/);
  assert.doesNotMatch(read('../src/app/datenschutz/unternehmen/stand-2026-11-19/page.tsx'),/recommendationsEnabled/);
});
