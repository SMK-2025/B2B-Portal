import { describe,it,expect,vi } from "vitest";
import { firstValueFrom,of } from "rxjs";
import { PortalStore } from "./portal.store";
import { PersistenceInterceptor } from "./persistence.interceptor";
describe("read-only persistence boundaries",()=>{
  it("does not serialize all company files for health, public branding or unsaved PagePilot drafts",async()=>{
    const store=new PortalStore(),snapshot=vi.spyOn(store,"snapshot"),interceptor=new PersistenceInterceptor(store);
    for(const [method,path] of [["GET","/health"],["GET","/api/networks/branding/city"],["GET","/api/networks/branding/city/texts"],["POST","/api/networks/id/profile/import"]]){
      const context={switchToHttp:()=>({getRequest:()=>({method,path,headers:{}})})} as any;
      expect(await firstValueFrom(interceptor.intercept(context,{handle:()=>of("ok")}))).toBe("ok");
    }
    expect(snapshot).not.toHaveBeenCalled();
    const context={switchToHttp:()=>({getRequest:()=>({method:"POST",path:"/api/networks/id/profile",headers:{}})})} as any;
    await firstValueFrom(interceptor.intercept(context,{handle:()=>of("ok")}));
    expect(snapshot).toHaveBeenCalledTimes(2);
  });
});
