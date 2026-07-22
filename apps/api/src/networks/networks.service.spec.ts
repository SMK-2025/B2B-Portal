import {describe,expect,it} from "vitest";
import {AuthService} from "../auth/auth.service";
import {EmailService} from "../auth/email.service";
import {hashPassword} from "../auth/password";
import {PortalStore} from "../core/portal.store";
import {OrganizationsService} from "../organizations/organizations.service";
import {NetworksService} from "./networks.service";

describe("network tenancy",()=>{
 it("allows only the platform owner to activate trials and appoint network administrators",async()=>{
  const store=new PortalStore();const auth=new AuthService(store);const organizations=new OrganizationsService(store,auth);const networks=new NetworksService(store,auth,new EmailService());
  const adminId="platform-admin";store.users.set(adminId,{id:adminId,email:"admin@b2bmatching.de",passwordHash:await hashPassword("Sehr-Sicher-2026!"),firstName:"Portal",lastName:"Admin",accountRole:"platform_admin",emailVerifiedAt:new Date().toISOString(),createdAt:new Date().toISOString()});store.userByEmail.set("admin@b2bmatching.de",adminId);
  const adminLogin=await auth.login({email:"admin@b2bmatching.de",password:"Sehr-Sicher-2026!"});const adminBearer=`Bearer ${adminLogin.token}`;
  expect(()=>networks.publicBySlug("test-netzwerk")).toThrow();
  const created=networks.create(adminBearer,{name:"Test Netzwerk",slug:"test-netzwerk",websiteUrl:"https://netzwerk.example",enabledModules:["members","events"]});
  const trial=networks.setAccess(adminBearer,created.id,{status:"trial",trialDays:10,selfRegistration:false});
  expect(trial.status).toBe("trial");expect(trial.trialEndsAt).not.toBeNull();

  const registration=await auth.register({email:"mitglied@example.de",password:"Sehr-Sicher-2026!",firstName:"Mara",lastName:"Klein"});auth.verifyEmail(registration.verificationToken);
  const login=await auth.login({email:"mitglied@example.de",password:"Sehr-Sicher-2026!"});const bearer=`Bearer ${login.token}`;
  const organization=organizations.create(bearer,{legalName:"Mitglied GmbH",displayName:"Mitglied",role:"both",websiteUrl:"https://example.de",networkSlug:"test-netzwerk"});
  expect(store.networkMemberships[0]).toMatchObject({networkId:created.id,organizationId:organization.id,status:"pending",role:"organization_admin"});
  networks.review(adminBearer,created.id,store.networkMemberships[0].id,{decision:"active"});
  expect(networks.mine(bearer)[0].network.slug).toBe("test-netzwerk");
  expect(()=>networks.addMember(bearer,created.id,{organizationId:organization.id,userId:registration.user.id,role:"network_admin"})).toThrow();
  const networkAdmin=networks.appointAdministrator(adminBearer,created.id,{email:"mitglied@example.de"});
  expect(networkAdmin.role).toBe("network_admin");
  expect(networks.adminList(adminBearer)[0].administrator?.user?.email).toBe("mitglied@example.de");
  const second=networks.create(adminBearer,{name:"Zweites Netzwerk",slug:"zweites-netzwerk",websiteUrl:"https://zweites.example",enabledModules:["members","events"]});
  expect(second).toMatchObject({status:"draft",trialEndsAt:null});
  expect(second.settings.selfRegistration).toBe(false);
  expect(networks.adminList(adminBearer)).toHaveLength(2);
 });
});
