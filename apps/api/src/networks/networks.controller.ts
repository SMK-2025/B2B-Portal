import {Body,Controller,Get,Headers,Param,Post} from "@nestjs/common";
import {NetworksService} from "./networks.service";

@Controller("networks")
export class NetworksController{
 constructor(private readonly networks:NetworksService){}
 @Get("public/:slug")publicNetwork(@Param("slug")slug:string){return this.networks.publicBySlug(slug)}
 @Get("mine")mine(@Headers("authorization")authorization:string|undefined){return this.networks.mine(authorization)}
 @Post(":slug/applications")apply(@Headers("authorization")authorization:string|undefined,@Param("slug")slug:string,@Body()body:Record<string,unknown>){return this.networks.apply(authorization,slug,body)}
 @Get(":networkId/memberships")members(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string){return this.networks.listMembers(authorization,networkId)}
 @Post(":networkId/memberships")add(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.addMember(authorization,networkId,body)}
 @Post(":networkId/memberships/:membershipId/review")review(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("membershipId")membershipId:string,@Body()body:Record<string,unknown>){return this.networks.review(authorization,networkId,membershipId,body)}
}
