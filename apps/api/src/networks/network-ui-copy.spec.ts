import { describe,it,expect } from 'vitest';
import { networkUiCopy,NETWORK_UI_COPY } from '../../../web/src/app/lib/network-ui-copy';

describe('shared network interface language',()=>{
  it('uses the same member chat labels in every network without copying tenant content',()=>{
    expect(networkUiCopy('ui.nav.kommunikation',{},'PartnerChat')).toBe('Mitglieder-Chat');
    expect(networkUiCopy('ui.home.title',{},'Individuelle Begrüßung')).toBe('Individuelle Begrüßung');
    expect(networkUiCopy('ui.portal.name',{},'Unternehmerfreunde')).toBe('Unternehmerfreunde');
    expect(networkUiCopy('ui.account.membership.network-name',{},'Köln')).toBe('Köln');
    expect(Object.keys(NETWORK_UI_COPY).some(k=>k.includes('spiel')||k.includes('home.')||k.includes('portal.name'))).toBe(false);
  });
  it('preserves explicit network-specific edits over shared defaults',()=>{
    expect(networkUiCopy('ui.nav.kommunikation',{'ui.nav.kommunikation':'Unser Austausch'},'PartnerChat')).toBe('Unser Austausch');
    expect(networkUiCopy('ui.home.title',{'ui.home.title':'Willkommen in Köln'},'Fallback')).toBe('Willkommen in Köln');
  });
});
