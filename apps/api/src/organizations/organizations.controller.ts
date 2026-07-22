import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizations: OrganizationsService) {}
  @Post() create(@Headers("authorization") auth: string | undefined, @Body() body: Record<string,unknown>) { return this.organizations.create(auth,body); }
  @Get("mine") mine(@Headers("authorization") auth: string | undefined) { return this.organizations.listMine(auth); }
  @Get(":id/profile") getProfile(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.organizations.profile(auth,id);}
  @Post(":id/profile") profile(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() body:Record<string,unknown>){return this.organizations.updateProfile(auth,id,body);}
  @Post(":id/submit") submit(@Headers("authorization") auth: string | undefined,@Param("id") id:string) { return this.organizations.submit(auth,id); }
}
