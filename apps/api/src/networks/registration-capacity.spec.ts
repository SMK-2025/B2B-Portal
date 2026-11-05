import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { PortalStore } from "../core/portal.store";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "../auth/email.service";
import { NetworksService } from "./networks.service";
import { hashPassword, tokenHash } from "../auth/password";

// Isolated, no database connection and no real mail transport. This measures
// application behavior, not the production database, provider quota or HTTP RPS.
describe("registration burst and tenant boundaries", () => {
  it("handles 100 parallel registrations across four networks without cross-tenant access or duplicate accounts", async () => {
    const store=new PortalStore();
    const mails: Array<{email:string;token:string}>=[];
    const email={sendVerification:vi.fn(async(input:any)=>{mails.push(input);}),directLinksEnabled:()=>true} as unknown as EmailService;
    const auth=new AuthService(store,email), networks=new NetworksService(store,auth,email);
    const ownerId=randomUUID(),ownerToken="isolated-audit-owner",now=new Date().toISOString();
    store.users.set(ownerId,{id:ownerId,email:"owner@example.test",passwordHash:await hashPassword("Audit-Sicher-2026!"),firstName:"Owner",lastName:"Audit",accountRole:"platform_admin",emailVerifiedAt:now,createdAt:now});
    store.sessions.set(tokenHash(ownerToken),{tokenHash:tokenHash(ownerToken),userId:ownerId,expiresAt:new Date(Date.now()+600000).toISOString()});
    const owner="Bearer "+ownerToken;
    const slugs=["unternehmerfreunde","bayer04leverkusen","unternehmernetzwerkleverkusen","unternehmernetzwerkkoeln"];
    const net=slugs.map((slug,i)=>{const n=networks.create(owner,{name:"Audit Netzwerk "+i,slug});networks.setAccess(owner,n.id,{status:"active"});return n;});
    const duration:number[]=[];const start=performance.now();
    const results=await Promise.all(Array.from({length:100},async(_,i)=>{
      const n=net[i%4],t=performance.now();
      await networks.requestParticipation({network:n.slug,email:"audit-"+i+"@example.test",password:"Audit-Sicher-2026!",firstName:"Audit",lastName:"Mitglied"+i,company:"Audit Betrieb "+i,
        affiliation:n.slug==="unternehmerfreunde"?"Interesse an einer Mitgliedschaft":n.slug==="bayer04leverkusen"?"Hospitality-/VIP-Gast":n.slug==="unternehmernetzwerkkoeln"?"Unternehmenssitz in Köln":"Unternehmenssitz in Leverkusen",
        accurate:true,costsAccepted:true,termsAccepted:true,privacyAcknowledged:true,offerVersion:networks.participationQuote(n.slug).version});
      duration.push(performance.now()-t);return n;
    }));
    expect(mails).toHaveLength(100);expect(store.users.size).toBe(101);expect(store.networkMemberships).toHaveLength(0);
    expect(store.userByEmail.size).toBe(100);
    for(let i=0;i<100;i++){
      const n=results[i],userId=store.userByEmail.get("audit-"+i+"@example.test")!;
      const mail=mails.find(m=>m.email==="audit-"+i+"@example.test")!;auth.verifyEmail(mail.token);
      const token="audit-user-"+i;store.sessions.set(tokenHash(token),{tokenHash:tokenHash(token),userId,expiresAt:new Date(Date.now()+600000).toISOString()});
      const bearer="Bearer "+token;
      expect(networks.participationStatus(bearer,n.slug).status).toBe("pending");
      expect(()=>networks.listMembers(bearer,n.id)).toThrow();
      expect(()=>networks.dashboard(bearer,net[(i+1)%4].id)).toThrow();
    }
    const duplicate=await Promise.allSettled(Array.from({length:12},()=>auth.register({email:"same@example.test",password:"Audit-Sicher-2026!",firstName:"Audit",lastName:"Duplicate"})));
    expect(duplicate.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect([...store.users.values()].filter(u=>u.email==="same@example.test")).toHaveLength(1);
    duration.sort((a,b)=>a-b);
    console.log("CAPACITY_REGISTRATIONS",JSON.stringify({registrations:100,networks:4,totalMs:Math.round(performance.now()-start),p50Ms:Math.round(duration[49]),p95Ms:Math.round(duration[94]),p99Ms:Math.round(duration[98]),snapshotBytes:Buffer.byteLength(store.snapshot()),rssBytes:process.memoryUsage().rss,realEmails:0,databaseMeasured:false}));
  },30000);

  it("measures snapshot growth with synthetic company media without accessing live accounts", () => {
    const samples=[];
    for(const count of [100,500,1000]){
      const store=new PortalStore(),image="data:image/webp;base64,"+"A".repeat(128*1024);
      for(let i=0;i<count;i++)store.organizations.set(String(i),{id:String(i),networkProfile:{companyName:"Synthetic "+i,heroImageUrl:image}} as any);
      const start=performance.now(),snapshot=store.snapshot();
      samples.push({companies:count,serializedMediaPerCompanyKiB:128,snapshotMiB:Number((Buffer.byteLength(snapshot)/1048576).toFixed(2)),serializeMs:Math.round(performance.now()-start)});
    }
    console.log("CAPACITY_SNAPSHOTS",JSON.stringify(samples));
    expect(samples[2].snapshotMiB).toBeGreaterThan(120);
  },30000);
});
