import {describe,expect,it} from "vitest";
import {AuthService} from "../auth/auth.service";
import {hashPassword} from "../auth/password";
import {PortalStore,UNTERNEHMERFREUNDE_NETWORK_ID} from "../core/portal.store";
import {OrganizationsService} from "../organizations/organizations.service";
import {NetworksService} from "./networks.service";

describe("network tenancy",()=>{
 it("registers an organization into Unternehmerfreunde NRW and requires approval",async()=>{
  const store=new PortalStore();const auth=new AuthService(store);const organizations=new OrganizationsService(store,auth);const networks=new NetworksService(store,auth);
  const registration=await auth.register({email:"mitglied@example.de",password:"Sehr-Sicher-2026!",firstName:"Mara",lastName:"Klein"});
  auth.verifyEmail(registration.verificationToken);
  const login=await auth.login({email:"mitglied@example.de",password:"Sehr-Sicher-2026!"});const bearer=`Bearer ${login.token}`;
  const organization=organizations.create(bearer,{legalName:"Mitglied GmbH",displayName:"Mitglied",role:"both",websiteUrl:"https://example.de",networkSlug:"unternehmerfreunde-nrw"});
  expect(store.networkMemberships).toHaveLength(1);expect(store.networkMemberships[0]).toMatchObject({networkId:UNTERNEHMERFREUNDE_NETWORK_ID,organizationId:organization.id,status:"pending",role:"organization_admin"});
  expect(networks.mine(bearer)).toHaveLength(0);

  const adminId="platform-admin";store.users.set(adminId,{id:adminId,email:"admin@b2bmatching.de",passwordHash:await hashPassword("Sehr-Sicher-2026!"),firstName:"Portal",lastName:"Admin",accountRole:"platform_admin",emailVerifiedAt:new Date().toISOString(),createdAt:new Date().toISOString()});store.userByEmail.set("admin@b2bmatching.de",adminId);
  const adminLogin=await auth.login({email:"admin@b2bmatching.de",password:"Sehr-Sicher-2026!"});const adminBearer=`Bearer ${adminLogin.token}`;
  networks.review(adminBearer,UNTERNEHMERFREUNDE_NETWORK_ID,store.networkMemberships[0].id,{decision:"active"});
  expect(networks.mine(bearer)[0].network.slug).toBe("unternehmerfreunde-nrw");
  expect(networks.publicBySlug("unternehmerfreunde-nrw").enabledModules).toContain("events");
 });
});
