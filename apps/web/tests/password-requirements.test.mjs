import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordReady, passwordRequirements } from '../src/app/lib/password-requirements.ts';

test('all criteria start unmet, including matching empty passwords', () => {
  assert.equal(passwordRequirements('', '').every(rule => !rule.met), true);
  assert.equal(passwordReady('', ''), false);
});
test('valid passwords require matching confirmation', () => {
  assert.equal(passwordReady('Individuell-Test-2026!', 'Individuell-Test-2026!'), true);
  assert.equal(passwordReady('Individuell-Test-2026!', ''), false);
  assert.equal(passwordReady('Individuell-Test-2026!', 'Anderes-Passwort-2026!'), false);
});
test('every backend password rule gates saving', () => {
  for (const password of ['Kurz1!', 'langnurklein123!', 'LANGNURGROSS123!', 'OhneZahlSehrLang!', 'BeispielKunde2026', 'Password-Test-2026!', 'Qwertz-Test-2026!', 'Abcdef!!!!!!2026', 'a'.repeat(201) + 'A1!']) assert.equal(passwordReady(password, password), false, password);
});
test('umlauts allowed, whitespace is not a special character', () => {
  assert.equal(passwordReady('ÄäüöLang-2026!', 'ÄäüöLang-2026!'), true);
  assert.equal(passwordReady('Beispiel 2026', 'Beispiel 2026'), false);
});
