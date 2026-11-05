import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { RecordPersistence, type StorageSql } from './record-persistence';
import { PortalStore } from './portal.store';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../auth/email.service';
import { vi } from 'vitest';

function adapter(db:any):StorageSql {
  return {unsafe:async(q,p=[]) => (await db.query(q,p)).rows,
    begin:work=>db.transaction((tx:any)=>work(adapter(tx)))};
}
async function setup() {
  const db=new PGlite();
  await db.exec("CREATE TABLE portal_state(id text PRIMARY KEY,payload jsonb NOT NULL,revision bigint NOT NULL DEFAULT 0,updated_at timestamptz DEFAULT now())");
  await db.exec(readFileSync(new URL('../../../../packages/database/migrations/008_record_storage.sql',import.meta.url),'utf8'));
  return {db,sql:adapter(db)};
}
describe('individual PostgreSQL record persistence',()=>{
  it('migrates an existing full snapshot atomically and restores all collections after restart',async()=>{
    const {db,sql}=await setup();
    try{
      const original=new PortalStore();
      original.users.set('u',{id:'u',email:'u@example.test',firstName:'Test'} as any);
      original.userByEmail.set('u@example.test','u');
      original.networks.set('a',{id:'a',settings:{memberBilling:{months:12}},name:'A'} as any);
      original.organizations.set('o',{id:'o',displayName:'Company',networkProfile:{logoUrl:'data:image/png;base64,'+Buffer.alloc(1024,7).toString('base64')}} as any);
      const snapshot=original.snapshot();await sql.unsafe("INSERT INTO portal_state(id,payload,revision) VALUES('primary',$1::jsonb,4)",[snapshot]);
      const store=new PortalStore();Object.assign(store,{sql,recordStorage:true});await (store as any).restore();
      expect(JSON.parse(store.snapshot())).toEqual(JSON.parse(snapshot));
      const restarted=new PortalStore();Object.assign(restarted,{sql,recordStorage:true});await (restarted as any).restore();
      expect(JSON.parse(restarted.snapshot())).toEqual(JSON.parse(snapshot));
      expect((await sql.unsafe('SELECT payload FROM portal_state'))[0].payload.storageVersion).toBe(2);
    }finally{await db.close();}
  },30000);
  it('persists 100 concurrent registrations with 1000 existing synthetic company profiles',async()=>{
    const {db,sql}=await setup();
    try{
      const store=new PortalStore();Object.assign(store,{sql,recordStorage:true});
      for(let i=0;i<1000;i++){
        const bytes=Buffer.alloc(8192,i%256);bytes.writeUInt32BE(i,0);
        store.organizations.set(String(i),{id:String(i),networkProfile:{companyName:'Synthetic '+i,heroImageUrl:'data:image/webp;base64,'+bytes.toString('base64')}} as any);
      }
      await store.persist();const started=performance.now();
      const emails={sendVerification:vi.fn(async()=>{}),directLinksEnabled:()=>true} as unknown as EmailService;
      const auth=new AuthService(store,emails);
      await Promise.all(Array.from({length:100},(_,i)=>auth.register({email:`isolated-${i}@example.test`,password:'Audit-Sicher-2026!',firstName:'Test',lastName:'Member'})));
      await store.persist();
      const elapsed=Math.round(performance.now()-started);
      const manifest=(await sql.unsafe('SELECT payload FROM portal_state'))[0].payload;
      expect(manifest.counts.users).toBe(100);expect(emails.sendVerification).toHaveBeenCalledTimes(100);
      const restarted=new PortalStore();Object.assign(restarted,{sql,recordStorage:true});await (restarted as any).restore();
      expect(restarted.users.size).toBe(100);expect(restarted.organizations.size).toBe(1000);
      expect(restarted.organizations.get('25')?.networkProfile?.heroImageUrl).toBe(store.organizations.get('25')?.networkProfile?.heroImageUrl);
      expect(Buffer.byteLength(JSON.stringify(manifest))).toBeLessThan(4096);
      console.log('CAPACITY_RECORD_STORAGE',JSON.stringify({existingCompanies:1000,uniqueImageKiB:8,concurrentRegistrations:100,totalMs:elapsed,checkpointBytes:Buffer.byteLength(JSON.stringify(manifest)),privateMediaFiles:(await sql.unsafe('SELECT count(*)::int AS n FROM portal_media'))[0].n,engine:'isolated PostgreSQL/PGlite',productionLoad:false,realEmails:0}));
    }finally{await db.close();}
  },60000);
  it('round trips private media and scalar maps; keeps networks independent and deduplicates assets',async()=>{
    const {db,sql}=await setup();
    try {
      const image='data:image/png;base64,'+Buffer.alloc(4096,42).toString('base64');
      const collections={networks:new Map([['a',{id:'a',settings:{memberBilling:{months:12},launchPromotion:{enabled:true}}}],['b',{id:'b'}]]),
        networkMemberships:[{id:'ma',networkId:'a',organizationId:'oa'},{id:'mb',networkId:'b',organizationId:'ob'}],
        organizations:new Map([['oa',{networkId:'a',logo:image,name:'A'}],['ob',{networkId:'b',logo:image,name:'B'}]]),
        userByEmail:new Map([['test@example.de','user-id']])};
      const store=new RecordPersistence(); let revision=await store.save(sql,0,collections);
      expect(revision).toBe(1);
      expect((await sql.unsafe('SELECT count(*)::int AS n FROM portal_media'))[0].n).toBe(1);
      const before=(await sql.unsafe("SELECT fingerprint FROM portal_records WHERE collection='organizations' AND record_key='ob'"))[0].fingerprint;
      collections.organizations.get('oa')!.name='Changed';
      revision=await store.save(sql,revision,collections);
      expect((await sql.unsafe("SELECT fingerprint FROM portal_records WHERE collection='organizations' AND record_key='ob'"))[0].fingerprint).toBe(before);
      const manifest=(await sql.unsafe('SELECT payload FROM portal_state'))[0].payload;
      expect(manifest.networks[0][1].settings.memberBilling).toEqual({months:12});
      const loaded=await new RecordPersistence().load(sql,manifest,collections);
      expect(loaded.organizations).toEqual([...collections.organizations]);
      expect(loaded.userByEmail).toEqual([['test@example.de','user-id']]);
      expect(JSON.stringify(manifest)).not.toContain(image);
      await expect(new RecordPersistence().save(sql,0,collections)).rejects.toThrow(/Paralleler/);
      expect((await sql.unsafe('SELECT revision FROM portal_state'))[0].revision).toBe(revision);
      collections.organizations.delete('oa'); revision=await store.save(sql,revision,collections);
      expect((await sql.unsafe('SELECT count(*)::int AS n FROM portal_media'))[0].n).toBe(1);
      collections.organizations.delete('ob'); await store.save(sql,revision,collections);
      expect((await sql.unsafe('SELECT count(*)::int AS n FROM portal_media'))[0].n).toBe(0);
    }finally{await db.close();}
  },30000);
  it('refuses incomplete or corrupted assets instead of silently losing uploads',async()=>{
    const {db,sql}=await setup();
    try{
      const collections={profiles:new Map([['p',{networkId:'a',image:'data:image/png;base64,'+Buffer.alloc(1024,1).toString('base64')}]])};
      await new RecordPersistence().save(sql,0,collections);
      const manifest=(await sql.unsafe('SELECT payload FROM portal_state'))[0].payload;
      await sql.unsafe('DELETE FROM portal_media');
      await expect(new RecordPersistence().load(sql,manifest,collections)).rejects.toThrow(/Missing stored/);
    }finally{await db.close();}
  },30000);
});
