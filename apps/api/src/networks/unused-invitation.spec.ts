import {describe,it,expect} from "vitest";
import {PortalStore} from "../core/portal.store";
import {AuthService} from "../auth/auth.service";
import {EmailService} from "../auth/email.service";
import {tokenHash} from "../auth/password";
import {NetworksService} from "./networks.service";
function fixture(){
  const store=new PortalStore(),now=new Date().toISOString(),auth=new AuthService(store),service=new NetworksService(store,auth,new EmailService());
  for(const [id,role] of [["owner","platform_admin"],["member","user"]] as const){store.users.set(id,{id,email:id+"@example.invalid",passwordHash:"unused",firstName:id,lastName:"Test",accountRole:role,emailVerifiedAt:now,createdAt:now});store.sessions.set(tokenHash(id),{tokenHash:tokenHash(id),userId:id,expiresAt:new Date(Date.now()+86400000).toISOString()});}
  const network=service.create("Bearer owner",{name:"Test Club",slug:"test-club"});
  const invitation={id:"invite",networkId:network.id,type:"topic" as const,status:"published" as const,visibility:"members" as const,title:"Einladung",description:"",createdByUserId:"owner",assignedToUserId:null,startsAt:null,endsAt:"2020-01-01",data:{kind:"network_invitation",email:"invitee@example.invalid",role:"member"},createdAt:now,updatedAt:now};
  store.networkContents.set(invitation.id,invitation);
  return {store,service,network,invitation};
}
describe("unused invitation deletion",()=>{
  it("removes only same-email unused invitations in the selected network, never accounts, orders or other networks",async()=>{
    const f=fixture();f.store.networkContents.set("duplicate",{...f.invitation,id:"duplicate"});f.store.networkContents.set("foreign",{...f.invitation,id:"foreign",networkId:"other"});
    expect(f.service.adminUsers("Bearer owner",f.network.id).users.find(u=>u.email==="invitee@example.invalid")?.invitationId).toBeTruthy();
    const beforeUsers=f.store.users.size,beforeOrders=f.store.networkOrders.size;
    expect(await f.service.deleteUnusedInvitation("Bearer owner",f.network.id,"invite",{confirmEmail:"invitee@example.invalid"})).toEqual({deleted:true,count:2});
    expect(f.store.networkContents.has("foreign")).toBe(true);expect(f.store.users.size).toBe(beforeUsers);expect(f.store.networkOrders.size).toBe(beforeOrders);
    expect(f.service.adminUsers("Bearer owner",f.network.id).users.some(u=>u.email==="invitee@example.invalid")).toBe(false);
  });
  it("denies non-operators, changed addresses, foreign networks, used invitations and newly registered invitees",async()=>{
    const f=fixture(),body={confirmEmail:"invitee@example.invalid"};
    await expect(f.service.deleteUnusedInvitation("Bearer member",f.network.id,"invite",body)).rejects.toThrow();
    await expect(f.service.deleteUnusedInvitation("Bearer owner",f.network.id,"invite",{confirmEmail:"wrong@example.invalid"})).rejects.toThrow();
    await expect(f.service.deleteUnusedInvitation("Bearer owner",f.network.id,"foreign",body)).rejects.toThrow();
    f.invitation.data={...f.invitation.data,usedAt:"used"} as typeof f.invitation.data;
    await expect(f.service.deleteUnusedInvitation("Bearer owner",f.network.id,"invite",body)).rejects.toThrow();
    delete (f.invitation.data as Record<string,unknown>).usedAt;f.store.userByEmail.set(body.confirmEmail,"member");
    await expect(f.service.deleteUnusedInvitation("Bearer owner",f.network.id,"invite",body)).rejects.toThrow(/registriert/);expect(f.store.networkContents.has("invite")).toBe(true);
  });
});
