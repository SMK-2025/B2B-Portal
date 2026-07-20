import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { AdminService } from "./admin.service";
@Controller("admin/reviews")
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin:AdminService) {}
  @Get() queue(@Headers("authorization") auth:string|undefined){return this.admin.queue(auth);}
  @Get("members") members(@Headers("authorization") auth:string|undefined){return this.admin.members(auth);}
  @Post(":organizationId/decision") decide(@Headers("authorization") auth:string|undefined,@Param("organizationId") id:string,@Body() body:Record<string,unknown>){return this.admin.decide(auth,id,body);}
  @Get("services/queue") serviceQueue(@Headers("authorization") auth:string|undefined){return this.admin.serviceQueue(auth);}
  @Post("services/:serviceId/decision") decideService(@Headers("authorization") auth:string|undefined,@Param("serviceId") id:string,@Body() body:Record<string,unknown>){return this.admin.decideService(auth,id,body);}
  @Get("needs/queue") needQueue(@Headers("authorization") auth:string|undefined){return this.admin.needQueue(auth);}
  @Post("needs/:needId/decision") decideNeed(@Headers("authorization") auth:string|undefined,@Param("needId") id:string,@Body() body:Record<string,unknown>){return this.admin.decideNeed(auth,id,body);}
}
