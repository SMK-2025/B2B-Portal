import { test } from 'node:test';
import assert from 'node:assert/strict';
import { companySetupProgress } from '../src/app/lib/company-setup-progress.ts';

const complete = {companyName:'Beispiel GmbH',tagline:'Leistungen vor Ort',description:'Eine ausführliche Beschreibung mit mehr als dreißig Zeichen.',street:'Beispielstraße 1',postalCode:'51373',city:'Leverkusen',country:'Deutschland',services:'Beratung und Entwicklung',contactName:'Max Muster',contactPosition:'Inhaber',contactEmail:'max@example.com',contactPhone:'021400000'};
test('empty drafts start at the company step',()=>{assert.equal(companySetupProgress(null).nextStep,0);assert.equal(companySetupProgress({}).ready,false);});
test('images and optional fields do not block publication readiness',()=>{assert.equal(companySetupProgress(complete).ready,true);assert.equal(companySetupProgress(complete).completed,3);});
test('resume at the first incomplete group',()=>{assert.equal(companySetupProgress({...complete,services:''}).nextStep,1);assert.equal(companySetupProgress({...complete,contactPhone:''}).nextStep,3);});
test('invalid contact details and whitespace are not treated as complete',()=>{assert.equal(companySetupProgress({...complete,contactEmail:'invalid'}).ready,false);assert.equal(companySetupProgress({...complete,description:'  short  '}).ready,false);});
test('progress is isolated to the profile supplied',()=>{companySetupProgress(complete);assert.equal(companySetupProgress({}).completed,0);assert.equal(complete.companyName,'Beispiel GmbH');});
