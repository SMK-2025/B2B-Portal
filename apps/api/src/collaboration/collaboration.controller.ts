import{Body,Controller,Get,Headers,Inject,Param,Post}from"@nestjs/common";import{CollaborationService}from"./collaboration.service";
@Controller()export class CollaborationController{constructor(@Inject(CollaborationService)private readonly c:CollaborationService){}
@Get("matches/:id/conversation")conversation(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.c.conversation(a,id);}
@Post("matches/:id/messages")message(@Headers("authorization")a:string|undefined,@Param("id")id:string,@Body("body")body:unknown){return this.c.message(a,id,body);}
@Post("matches/:id/meetings")meeting(@Headers("authorization")a:string|undefined,@Param("id")id:string,@Body()body:Record<string,unknown>){return this.c.meeting(a,id,body);}
@Post("meetings/:id/status")meetingStatus(@Headers("authorization")a:string|undefined,@Param("id")id:string,@Body("status")status:unknown){return this.c.meetingStatus(a,id,status);}
@Get("matches/:id/timeline")timeline(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.c.timeline(a,id);}
@Get("notifications")notifications(@Headers("authorization")a:string|undefined){return this.c.notifications(a);}
@Post("notifications/:id/read")readNotification(@Headers("authorization")a:string|undefined,@Param("id")id:string){return this.c.readNotification(a,id);}}
