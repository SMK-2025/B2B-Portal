import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { ServicesService } from "./services.service";
@Controller()
export class ServicesController{
  constructor(@Inject(ServicesService) private readonly services:ServicesService){}
  @Get("categories") categories(){return this.services.categories();}
  @Post("organizations/:organizationId/services") create(@Headers("authorization") auth:string|undefined,@Param("organizationId") organizationId:string,@Body() body:Record<string,unknown>){return this.services.create(auth,organizationId,body);}
  @Get("services/mine") mine(@Headers("authorization") auth:string|undefined){return this.services.mine(auth);}
  @Post("services/:id/update") update(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() body:Record<string,unknown>){return this.services.update(auth,id,body);}
  @Post("services/:id/duplicate") duplicate(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.services.duplicate(auth,id);}
  @Post("services/:id/delete") remove(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.services.remove(auth,id);}
  @Post("services/:id/submit") submit(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.services.submit(auth,id);}
}
