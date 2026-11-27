import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('chat identity wraps independently and both actions share equal columns and fixed control height',()=>{
 const source=read('../src/app/components/partner-chat-workspace.tsx'),css=read('../src/app/chat-header-layout.css');
 assert.match(source,/className="partnerChatIdentity"/);assert.match(source,/className="partnerChatHeaderActions"/);
 for(const pattern of [/repeat\(2,minmax\(0,1fr\)\)/,/height:56px/,/min-width:0/,/overflow-wrap:anywhere/,/grid-column:1\/-1/])assert.match(css,pattern);
});
test('long selected statuses wrap visibly while the native accessible picker and status workflow remain intact',()=>{
 const source=read('../src/app/components/chat-status.tsx'),css=read('../src/app/chat-header-layout.css');
 assert.match(source,/className="chatStatusDisplay" aria-hidden="true"/);assert.match(source,/className="chatStatusValue"/);
 assert.match(source,/<select[\s\S]*?aria-label="Gesprächsstatus ändern"/);assert.match(source,/setStage\(e.target.value\)/);assert.match(source,/setOpen\(true\)/);
 assert.match(css,/chatStatusValue\{[^}]*white-space:normal/);assert.match(css,/chatStatusPicker select\{[^}]*min-width:0/);assert.match(css,/focus-within/);
});
