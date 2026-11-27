import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('shared member chat shows portrait first, keeps the company logo and supports older profiles',()=>{
 const source=read('../src/app/components/partner-chat-workspace.tsx');
 assert.match(source,/contactPhotoUrl\?:string\|null/);
 assert.match(source,/person\?\.contactPhotoUrl \? <img className="partnerChatPortrait"/);
 assert.match(source,/person\?\.contactPhotoUrl&&person.logoUrl&&companyBadge/);
 assert.match(source,/<Avatar person=\{person\} \/>/);
 assert.doesNotMatch(source,/partnerChatCompanyLogo/);
 assert.match(source,/: person\?\.logoUrl \? \(/);
 const css=read('../src/app/partner-chat.css');assert.match(css,/\.partnerChatPortrait\{[^}]*object-fit:cover/);assert.match(css,/\.partnerChatLogoBadge\{[^}]*object-fit:contain/);
});
test('recommendation action uses network branding, contrast-aware text and accessible interaction states',()=>{const source=read('../src/app/components/member-recommendations.tsx'),css=read('../src/app/member-recommendations.css');assert.match(source,/className="recommendationTrigger"/);assert.match(source,/style=\{partnerBranding\(access\)\}/);assert.match(source,/aria-haspopup="dialog"/);for(const pattern of [/var\(--partner-primary/,/var\(--partner-ink/,/focus-visible/,/min-height:44px/])assert.match(css,pattern);assert.doesNotMatch(read('../src/app/partner-chat.css'),/partnerChatCompanyLogo/);});
