import { Body,Controller,Get,Headers,Inject,Param,Post } from "@nestjs/common";
import { NeedsService } from "./needs.service";
import { MatchingService } from "./matching.service";
@Controller()
export class MatchingController{
 constructor(@Inject(NeedsService)private readonly needs:NeedsService,@Inject(MatchingService)private readonly matching:MatchingService){}
 @Post("organizations/:organizationId/needs")create(@Headers("authorization")a:string|undefined,@Param("organizationId")o:string,@Body()b:Record<string,unknown>){return this.needs.create(a,o,b);}
 @Get("organizations/:organizationId/needs")mine(@Headers("authorization")a:string|undefined,@Param("organizationId")o:string){return this.needs.listMine(a,o);}
 @Post("needs/:id/update")update(@Headers("authorization")a:string|undefined,@Param("id")id:string,@Body()b:Record<string,unknown>){return this.needs.update(a,id,b);}
 @Post("needs/:id/duplicate")duplicate(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.needs.duplicate(a,id);}
 @Post("needs/:id/delete")remove(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.needs.remove(a,id);}
 @Post("needs/:id/submit")submit(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.needs.submit(a,id);}
 @Post("needs/:id/pause")pause(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.needs.pause(a,id);}
 @Post("needs/:id/activate")activate(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.needs.activate(a,id);}
 @Get("needs/:id/matches")matches(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.buyerMatches(a,id);}
 @Get("needs/:id/match-details")matchDetails(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.buyerMatchDetails(a,id);}
 @Post("matches/:id/release")release(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.release(a,id);}
 @Post("matches/:id/reject")reject(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.rejectBuyer(a,id);}
 @Get("provider/matches")inbox(@Headers("authorization")a:string|undefined){return this.matching.providerInbox(a);}
 @Post("provider/matches/:id/respond")respond(@Headers("authorization")a:string|undefined,@Param("id")id:string,@Body("interested")interested:boolean){return this.matching.providerDecision(a,id,interested);}
 @Post("matches/:id/release-identity")identity(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.matching.releaseIdentity(a,id);}
}
