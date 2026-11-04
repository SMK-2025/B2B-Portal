// Mechanical JSX-literal migration: member content and runtime values are never inspected.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const names = [
  'network-shell','network-auth-brand','network-dashboard-workspace',
  'network-module-workspace','network-members-workspace','network-profile-workspace',
  'network-administration-workspace','network-system-messages','network-game-schedule-workspace',
  'network-participation-request','partner-login-form','partner-chat-workspace',
  'network-referral-button','network-notifications',
  'network-bundesliga-card','network-exchange-workspace','network-event-recap-workspace',
  'network-connections','network-board-pager','network-revenue-workspace',
];
const files = names.map(n => `apps/web/src/app/components/${n}.tsx`);
files.push('apps/web/src/app/registrieren/page.tsx');
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file,'utf8');
  const tree = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const edits = [];
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === 'NetworkText') return;
    if (ts.isJsxExpression(node) && node.expression && ts.isConditionalExpression(node.expression)) {
      const isCopy = e => ts.isStringLiteral(e) ? /[a-zA-ZÄÖÜäöüß]{2}/.test(e.text) && !/AGB|Datenschutz|Rechnung|Zahlung|MwSt|akzeptiere/.test(e.text) : ts.isConditionalExpression(e) && isCopy(e.whenTrue) && isCopy(e.whenFalse);
      if (isCopy(node.expression) && !ts.isJsxAttribute(node.parent)) {
        const raw = node.getText(tree);
        const key = 'ui.' + path.basename(file,'.tsx') + '.' + crypto.createHash('sha256').update(raw.replace(/\s+/g,' ').trim()).digest('hex').slice(0,16);
        edits.push({ start:node.pos,end:node.end,value:`<NetworkText id="${key}">${raw}</NetworkText>` });
        return;
      }
    }
    if (ts.isJsxText(node) && node.text.trim()) {
      const parent = node.parent;
      const tag = ts.isJsxElement(parent) ? parent.openingElement.tagName.getText(tree) : '';
      if (['option','textarea','script','style','title','svg','NetworkText'].includes(tag)) return;
      const raw = node.getText(tree);
      // Do not turn separators, numeric counters or legal/payment acknowledgements into editable copy.
      if (!/[a-zA-ZÄÖÜäöüß]{2}/.test(raw) || /AGB|Datenschutz|akzeptiere|Kostenbeitr|Rechnung|MwSt|Zahlung|Einwilligung/.test(raw)) return;
      const normalized = raw.replace(/\s+/g,' ').trim();
      const key = 'ui.' + path.basename(file,'.tsx') + '.' + crypto.createHash('sha256').update(normalized).digest('hex').slice(0,16);
      edits.push({ start:node.pos, end:node.end, value:`<NetworkText id="${key}">${raw}</NetworkText>` });
      return;
    }
    ts.forEachChild(node,visit);
  }
  visit(tree);
  if (!edits.length) continue;
  for (const e of edits.sort((a,b)=>b.start-a.start)) source = source.slice(0,e.start)+e.value+source.slice(e.end);
  const rel = file.includes('/registrieren/') ? '../components/network-text-editor' : './network-text-editor';
  if (!source.includes('import { NetworkText }')) source = source.replace(/("use client";)/, `$1\nimport { NetworkText } from "${rel}";`);
  fs.writeFileSync(file,source);
  process.stdout.write(`${file}: ${edits.length} text fields\n`);
}
