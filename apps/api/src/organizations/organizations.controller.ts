import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizations: OrganizationsService) {}
  @Post() create(@Headers("authorization") auth: string | undefined, @Body() body: Record<string,unknown>) { return this.organizations.create(auth,body); }
  @Get("mine") mine(@Headers("authorization") auth: string | undefined) { return this.organizations.listMine(auth); }
  @Post("team-invitations/accept") acceptInvitation(@Headers("authorization")auth:string|undefined,@Body("token")token:unknown){return this.organizations.acceptInvitation(auth,token);}
  @Get(":id/team") team(@Headers("authorization")auth:string|undefined,@Param("id")id:string){return this.organizations.team(auth,id);}
  @Post(":id/team/invite") invite(@Headers("authorization")auth:string|undefined,@Param("id")id:string,@Body()body:Record<string,unknown>){return this.organizations.invite(auth,id,body);}
  @Post(":id/team/:userId/role") teamRole(@Headers("authorization")auth:string|undefined,@Param("id")id:string,@Param("userId")userId:string,@Body("role")role:unknown){return this.organizations.teamRole(auth,id,userId,role);}
  @Post(":id/team/:userId/remove") removeTeamMember(@Headers("authorization")auth:string|undefined,@Param("id")id:string,@Param("userId")userId:string){return this.organizations.removeTeamMember(auth,id,userId);}
  @Get(":id/favorites") favorites(@Headers("authorization")auth:string|undefined,@Param("id")id:string){return this.organizations.favorites(auth,id);}
  @Post(":id/favorites") addFavorite(@Headers("authorization")auth:string|undefined,@Param("id")id:string,@Body()body:Record<string,unknown>){return this.organizations.addFavorite(auth,id,body);}
  @Post(":id/favorites/:favoriteId/update") updateFavorite(@Headers("authorization")auth:string|undefined,@Param("id")id:string,@Param("favoriteId")favoriteId:string,@Body()body:Record<string,unknown>){return this.organizations.updateFavorite(auth,id,favoriteId,body);}
  @Post(":id/favorites/:favoriteId/remove") removeFavorite(@Headers("authorization")auth:string|undefined,@Param("id")id:string,@Param("favoriteId")favoriteId:string){return this.organizations.removeFavorite(auth,id,favoriteId);}
  @Get(":id/preferences") preferences(@Headers("authorization")auth:string|undefined,@Param("id")id:string){return this.organizations.preferences(auth,id);}
  @Post(":id/preferences") updatePreferences(@Headers("authorization")auth:string|undefined,@Param("id")id:string,@Body()body:Record<string,unknown>){return this.organizations.updatePreferences(auth,id,body);}
  @Get(":id/export") exportData(@Headers("authorization")auth:string|undefined,@Param("id")id:string){return this.organizations.exportData(auth,id);}
  @Get(":id/profile") getProfile(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.organizations.profile(auth,id);}
  @Post(":id/profile") profile(@Headers("authorization") auth:string|undefined,@Param("id") id:string,@Body() body:Record<string,unknown>){return this.organizations.updateProfile(auth,id,body);}
  @Post(":id/submit") submit(@Headers("authorization") auth: string | undefined,@Param("id") id:string) { return this.organizations.submit(auth,id); }
}
