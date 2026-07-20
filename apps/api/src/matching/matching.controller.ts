import { Body,Controller,Get,Headers,Inject,Param,Post } from "@nestjs/common";
import { NeedsService } from "./needs.service";
import { MatchingService } from "./matching.service";
@Controller()
export class MatchingController{
 constructor(@Inject(NeedsService)private readonly needs:NeedsService,@Inject(MatchingService)private readonly matching:MatchingService){}
 @Post("organizations/:organizationId/needs")create(@Headers("authorization")a:string|undefined,@Param("organizationId")o:string,@Body()b:Record<string,unknown>){return this.needs.create(a,o,b);}
 @Get("organizations/:organizationId/needs")mine(@Headers("authorization")a:string|undefined,@Param("organizationId")o:string){return this.needs.listMine(a,o);}
 @Post("needs/:id/activate")activate(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.needs.activate(a,id);}
 @Get("needs/:id/matches")matches(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.buyerMatches(a,id);}
 @Post("matches/:id/release")release(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.release(a,id);}
 @Post("matches/:id/reject")reject(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.rejectBuyer(a,id);}
 @Get("provider/matches")inbox(@Headers("authorization")a:string|undefined){return this.matching.providerInbox(a);}
 @Post("provider/matches/:id/respond")respond(@Headers("authorization")a:string|undefined,@Param("id")id:string,@Body("interested")interested:boolean){return this.matching.providerDecision(a,id,interested);}
 @Post("matches/:id/release-identity")identity(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.releaseIdentity(a,id);}
}
