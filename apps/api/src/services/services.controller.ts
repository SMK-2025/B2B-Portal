import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { ServicesService } from "./services.service";
@Controller()
export class ServicesController{
  constructor(@Inject(ServicesService) private readonly services:ServicesService){}
  @Get("categories") categories(){return this.services.categories();}
  @Post("organizations/:organizationId/services") create(@Headers("authorization") auth:string|undefined,@Param("organizationId") organizationId:string,@Body() body:Record<string,unknown>){return this.services.create(auth,organizationId,body);}
  @Get("services/mine") mine(@Headers("authorization") auth:string|undefined){return this.services.mine(auth);}
  @Post("services/:id/submit") submit(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.services.submit(auth,id);}
}
