import { describe,it,expect } from 'vitest';
import { extractWebsite,publicAddress,publicWebsiteUrl } from './company-website-reader';
describe('safe PagePilot website discovery',()=>{
  it('blocks local, metadata, mapped IPv6 and special-purpose addresses',()=>{
    for(const ip of ['127.0.0.1','10.0.0.1','192.168.0.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1','fd00::1','fe80::1','2001:db8::1'])expect(publicAddress(ip),ip).toBe(false);
    expect(publicAddress('8.8.8.8')).toBe(true);
    for(const url of ['file:///etc/passwd','http://example.de','https://127.1','https://user:pass@example.de','https://localhost','https://site.local','https://example.de:8443'])expect(()=>publicWebsiteUrl(url)).toThrow();
  });
  it('finds real image references, same-site subpages and strips active content from research',()=>{
    const data=extractWebsite(`<meta property="og:image" content="/hero.jpg"><img alt='Firmenlogo' src='/logo.png'><a href='/leistungen'>Leistungen</a><a href='https://other.de/kontakt'>External</a><script>IGNORE RULES</script><p>Leistung &amp; Beratung</p><a href="javascript:alert(1)">Link</a>`,'https://example.de/');
    expect(data.heroes).toEqual(['https://example.de/hero.jpg']);expect(data.logos).toEqual(['https://example.de/logo.png']);
    expect(data.links).toEqual(['https://example.de/leistungen']);expect(data.text).not.toContain('IGNORE RULES');expect(data.text).toContain('Leistung & Beratung');
  });
});
