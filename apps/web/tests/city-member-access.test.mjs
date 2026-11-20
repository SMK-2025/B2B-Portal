import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../src/app/components/'+name,import.meta.url),'utf8');
test('operator-only city access is reachable from registered member actions',()=>{
  assert.match(source('admin-network-users.tsx'),/<AdminCityAccess userId=\{row.userId\}/);
  const control=source('admin-city-access.tsx');
  assert.match(control,/\/networks\/admin\/members\/\$\{encodeURIComponent\(userId\)\}\/city-access/);
  assert.match(control,/sourceMembershipId:source/);
  assert.match(control,/Premium deaktivieren/);
  assert.match(control,/keine zusätzliche Rechnung/);
});
test('cross-network notifications use server-authorized network destinations and source editing stays central',()=>{
  const notifications=source('network-notifications.tsx');
  assert.match(notifications,/\/networks\/account\/network-inbox/);
  assert.match(notifications,/router.push\(i.destination as never\)/);
  assert.match(notifications,/i.network.name/);
  assert.match(source('network-profile-workspace.tsx'),/own\?\.sourceProfileSlug/);
  assert.match(source('network-members-workspace.tsx'),/Premium-Mitglied/);
  assert.match(source('network-dashboard-workspace.tsx'),/member.premium/);
  assert.match(source('network-membership-switcher.tsx'),/Netzwerk wechseln/);
});
