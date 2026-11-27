import {describe,it,expect} from 'vitest';
import {memberPhoto} from './member-photo';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
describe('member portrait validation',()=>{
  it('keeps existing portraits for legacy clients and allows explicit removal',()=>{expect(memberPhoto(undefined,png)).toBe(png);expect(memberPhoto(null,png)).toBeNull();expect(memberPhoto('',png)).toBeNull();expect(memberPhoto(undefined)).toBeNull();});
  it('accepts a bounded raster upload',()=>expect(memberPhoto(png)).toBe(png));
  it('rejects remote tracking URLs, SVG, non-images, malformed data and oversized media',()=>{for(const value of ['https://example.org/photo.jpg','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=','data:image/png;base64,YWJj',42,'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(150001)]).toString('base64')])expect(()=>memberPhoto(value,png)).toThrow();});
});
