import {Body,Controller,Get,Headers,Param,Post,Query} from "@nestjs/common";
import {NetworksService} from "./networks.service";

@Controller("networks")
export class NetworksController{
 constructor(private readonly networks:NetworksService){}
 @Post()create(@Headers("authorization")authorization:string|undefined,@Body()body:Record<string,unknown>){return this.networks.create(authorization,body)}
 @Get("admin")adminList(@Headers("authorization")authorization:string|undefined){return this.networks.adminList(authorization)}
 @Post(":networkId/access")access(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.setAccess(authorization,networkId,body)}
 @Post(":networkId/administrator")administrator(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.appointAdministrator(authorization,networkId,body)}
 @Post(":networkId/delete")remove(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.remove(authorization,networkId,body)}
 @Get("public/:slug")publicNetwork(@Param("slug")slug:string){return this.networks.publicBySlug(slug)}
 @Get("mine")mine(@Headers("authorization")authorization:string|undefined){return this.networks.mine(authorization)}
 @Post("applications")partnerApplication(@Headers("authorization")authorization:string|undefined,@Body()body:Record<string,unknown>){return this.networks.applyAsPartner(authorization,body)}
 @Post(":slug/applications")apply(@Headers("authorization")authorization:string|undefined,@Param("slug")slug:string,@Body()body:Record<string,unknown>){return this.networks.apply(authorization,slug,body)}
 @Get(":networkId/memberships")members(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string){return this.networks.listMembers(authorization,networkId)}
 @Post(":networkId/memberships")add(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.addMember(authorization,networkId,body)}
 @Post(":networkId/memberships/:membershipId/review")review(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("membershipId")membershipId:string,@Body()body:Record<string,unknown>){return this.networks.review(authorization,networkId,membershipId,body)}
 @Post(":networkId/memberships/invite")invite(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.inviteMember(authorization,networkId,body)}
 @Post(":networkId/memberships/:membershipId/status")membershipStatus(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("membershipId")membershipId:string,@Body()body:Record<string,unknown>){return this.networks.membershipStatus(authorization,networkId,membershipId,body)}
 @Get(":networkId/content")content(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Query("type")type?:string){return this.networks.listContent(authorization,networkId,type)}
 @Post(":networkId/content")createContent(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.createContent(authorization,networkId,body)}
 @Post(":networkId/content/:contentId")updateContent(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("contentId")contentId:string,@Body()body:Record<string,unknown>){return this.networks.updateContent(authorization,networkId,contentId,body)}
 @Get(":networkId/events/:eventId/attendance")attendance(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("eventId")eventId:string){return this.networks.attendance(authorization,networkId,eventId)}
 @Post(":networkId/events/:eventId/attendance/self")ownAttendance(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("eventId")eventId:string,@Body()body:Record<string,unknown>){return this.networks.updateOwnAttendance(authorization,networkId,eventId,body)}
 @Post(":networkId/events/:eventId/attendance/:membershipId")memberAttendance(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("eventId")eventId:string,@Param("membershipId")membershipId:string,@Body()body:Record<string,unknown>){return this.networks.updateMemberAttendance(authorization,networkId,eventId,membershipId,body)}
 @Get(":networkId/revenues")revenues(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string){return this.networks.revenues(authorization,networkId)}
 @Post(":networkId/revenues")createRevenue(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.createRevenue(authorization,networkId,body)}
 @Post(":networkId/revenues/:revenueId")updateRevenue(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("revenueId")revenueId:string,@Body()body:Record<string,unknown>){return this.networks.updateRevenue(authorization,networkId,revenueId,body)}
 @Get(":networkId/dashboard")dashboard(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string){return this.networks.dashboard(authorization,networkId)}
 @Get(":networkId/orders")orders(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string){return this.networks.orders(authorization,networkId)}
 @Post(":networkId/orders")order(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.order(authorization,networkId,body)}
 @Post(":networkId/orders/:orderId/decision")orderDecision(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Param("orderId")orderId:string,@Body()body:Record<string,unknown>){return this.networks.decideOrder(authorization,networkId,orderId,body)}
 @Post(":networkId/settings")settings(@Headers("authorization")authorization:string|undefined,@Param("networkId")networkId:string,@Body()body:Record<string,unknown>){return this.networks.updateSettings(authorization,networkId,body)}
}
