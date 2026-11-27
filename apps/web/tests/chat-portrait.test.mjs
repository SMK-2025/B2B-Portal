import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('shared member chat shows portrait first, keeps the company logo and supports older profiles',()=>{
 const source=read('../src/app/components/partner-chat-workspace.tsx');
 assert.match(source,/contactPhotoUrl\?:string\|null/);
 assert.match(source,/person\?\.contactPhotoUrl \? <img className="partnerChatPortrait"/);
 assert.match(source,/person\?\.contactPhotoUrl&&person.logoUrl&&companyBadge/);
 assert.match(source,/<Avatar person=\{person\} companyBadge=\{false\}/);
 assert.match(source,/className="partnerChatCompanyLogo"/);
 assert.match(source,/: person\?\.logoUrl \? \(/);
 const css=read('../src/app/partner-chat.css');assert.match(css,/\.partnerChatPortrait\{[^}]*object-fit:cover/);assert.match(css,/\.partnerChatLogoBadge\{[^}]*object-fit:contain/);
});
