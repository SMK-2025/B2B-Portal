import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { NetworksService } from "./networks.service";

@Controller("networks")
export class NetworksController {
  constructor(private readonly networks: NetworksService) {}
  @Get("admin/operator-mails") operatorMails(
    @Headers("authorization") auth: string | undefined,
  ) {
    return this.networks.operatorMailStatus(auth);
  }
  @Post(":networkId/operator-access") operatorAccess(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
  ) {
    return this.networks.operatorAccess(auth, id);
  }
  @Get(":networkId/system-messages") systemMessages(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
  ) {
    return this.networks.systemMessages(auth, id);
  }
  @Post(":networkId/system-messages") createSystemMessage(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.createSystemMessage(auth, id, body);
  }
  @Post(":networkId/system-messages/:messageId/archive") archiveSystemMessage(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Param("messageId") messageId: string,
  ) {
    return this.networks.archiveSystemMessage(auth, id, messageId);
  }
  @Post("invitations/quote") quote(@Body() body: Record<string, unknown>) {
    return this.networks.invitationQuote(body);
  }
  @Get("admin/member-registrations") registrations(
    @Headers("authorization") auth: string | undefined,
  ) {
    return this.networks.memberRegistrations(auth);
  }
  @Post("admin/member-registrations/:id") invoice(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateMemberInvoice(auth, id, body);
  }
  @Post(":networkId/member-pricing") pricing(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.memberPricing(auth, id, body);
  }
  @Get(":networkId/participants") participants(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
  ) {
    return this.networks.participants(auth, id);
  }
  @Post(":networkId/content/:contentId/vote") vote(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Param("contentId") contentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.vote(auth, id, contentId, body);
  }
  @Get(":networkId/notifications") notifications(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
  ) {
    return this.networks.networkNotifications(auth, id);
  }
  @Get(":networkId/content/:contentId/thread") thread(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Param("contentId") contentId: string,
  ) {
    return this.networks.thread(auth, id, contentId);
  }
  @Post(":networkId/content/:contentId/replies") reply(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Param("contentId") contentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.reply(auth, id, contentId, body);
  }
  @Post(":networkId/content/:contentId/replies/:messageId") respond(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Param("contentId") contentId: string,
    @Param("messageId") messageId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.respond(auth, id, contentId, messageId, body);
  }
  @Post() create(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.create(authorization, body);
  }
  @Get("modules/catalog") moduleCatalog() {
    return this.networks.moduleCatalog();
  }
  @Get("branding/:slug") branding(@Param("slug") slug: string) {
    return this.networks.branding(slug);
  }
  @Get("admin") adminList(
    @Headers("authorization") authorization: string | undefined,
  ) {
    return this.networks.adminList(authorization);
  }
  @Get("admin/:networkId/users") adminUsers(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
  ) {
    return this.networks.adminUsers(authorization, networkId);
  }
  @Post("admin/:networkId/shared-invitation") sharedInvitation(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.sharedInvitation(auth, id, body);
  }
  @Post("invitations/shared-resolve") resolveShared(
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.resolveSharedInvitation(body);
  }
  @Post("admin/:networkId/users/action") userAction(
    @Headers("authorization") auth: string | undefined,
    @Param("networkId") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.adminUserAction(auth, id, body);
  }
  @Post(":networkId/access") access(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.setAccess(authorization, networkId, body);
  }
  @Post(":networkId/administrator") administrator(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.appointAdministrator(authorization, networkId, body);
  }
  @Post(":networkId/delete") remove(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.remove(authorization, networkId, body);
  }
  @Get("public/:slug") publicNetwork(
    @Headers("authorization") authorization: string | undefined,
    @Param("slug") slug: string,
  ) {
    return this.networks.publicBySlug(authorization, slug);
  }
  @Get("mine") mine(
    @Headers("authorization") authorization: string | undefined,
  ) {
    return this.networks.mine(authorization);
  }
  @Post("invitations/claim") claimInvitation(
    @Headers("authorization") authorization: string | undefined,
  ) {
    return this.networks.claimInitiatorInvitation(authorization);
  }
  @Post("applications") partnerApplication(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.applyAsPartner(authorization, body);
  }
  @Post(":slug/applications") apply(
    @Headers("authorization") authorization: string | undefined,
    @Param("slug") slug: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.apply(authorization, slug, body);
  }
  @Get(":networkId/memberships") members(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
  ) {
    return this.networks.listMembers(authorization, networkId);
  }
  @Get(":networkId/profile") profile(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
  ) {
    return this.networks.ownProfile(authorization, networkId);
  }
  @Post(":networkId/profile") saveProfile(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateOwnProfile(authorization, networkId, body);
  }
  @Post(":networkId/profile/import") importProfile(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.importOwnProfile(authorization, networkId, body);
  }
  @Post(":networkId/memberships") add(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.addMember(authorization, networkId, body);
  }
  @Post(":networkId/memberships/:membershipId/review") review(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.review(authorization, networkId, membershipId, body);
  }
  @Post(":networkId/memberships/invite") invite(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.inviteMember(authorization, networkId, body);
  }
  @Post(":networkId/memberships/:membershipId/status") membershipStatus(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.membershipStatus(
      authorization,
      networkId,
      membershipId,
      body,
    );
  }
  @Get(":networkId/content") content(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Query("type") type?: string,
  ) {
    return this.networks.listContent(authorization, networkId, type);
  }
  @Post(":networkId/content") createContent(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.createContent(authorization, networkId, body);
  }
  @Post(":networkId/content/:contentId") updateContent(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("contentId") contentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateContent(
      authorization,
      networkId,
      contentId,
      body,
    );
  }
  @Post(":networkId/content/:contentId/delete") deleteContent(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("contentId") contentId: string,
  ) {
    return this.networks.deleteContent(authorization, networkId, contentId);
  }
  @Get(":networkId/events/:eventId/attendance") attendance(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("eventId") eventId: string,
  ) {
    return this.networks.attendance(authorization, networkId, eventId);
  }
  @Post(":networkId/events/:eventId/attendance/self") ownAttendance(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("eventId") eventId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateOwnAttendance(
      authorization,
      networkId,
      eventId,
      body,
    );
  }
  @Post(":networkId/events/:eventId/attendance/:membershipId") memberAttendance(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("eventId") eventId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateMemberAttendance(
      authorization,
      networkId,
      eventId,
      membershipId,
      body,
    );
  }
  @Get([":networkId/prob-schedule", ":networkId/bundesliga-schedule"])
  proBSchedule(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
  ) {
    return this.networks.sportsSchedule(authorization, networkId);
  }
  @Post([
    ":networkId/prob-schedule/:gameId/result",
    ":networkId/bundesliga-schedule/:gameId/result",
  ])
  proBResult(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("gameId") gameId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateProBResult(
      authorization,
      networkId,
      gameId,
      body,
    );
  }
  @Post([
    ":networkId/prob-schedule/:gameId/discussion",
    ":networkId/bundesliga-schedule/:gameId/discussion",
  ])
  proBDiscussion(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("gameId") gameId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateProBDiscussion(
      authorization,
      networkId,
      gameId,
      body,
    );
  }
  @Post([
    ":networkId/prob-schedule/:gameId/comments",
    ":networkId/bundesliga-schedule/:gameId/comments",
  ])
  proBComment(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("gameId") gameId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.addProBComment(authorization, networkId, gameId, body);
  }
  @Get(":networkId/revenues") revenues(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
  ) {
    return this.networks.revenues(authorization, networkId);
  }
  @Post(":networkId/revenues") createRevenue(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.createRevenue(authorization, networkId, body);
  }
  @Post(":networkId/revenues/:revenueId") updateRevenue(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("revenueId") revenueId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateRevenue(
      authorization,
      networkId,
      revenueId,
      body,
    );
  }
  @Get(":networkId/dashboard") dashboard(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
  ) {
    return this.networks.dashboard(authorization, networkId);
  }
  @Get(":networkId/orders") orders(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
  ) {
    return this.networks.orders(authorization, networkId);
  }
  @Post(":networkId/orders") order(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.networks.orders(authorization, networkId);
    throw new BadRequestException(
      "Separate Modulbuchungen wurden eingestellt. Partnermitglieder buchen alle Funktionen bei der Registrierung als Jahresmitgliedschaft; die Initiatorverwaltung ist kostenlos.",
    );
  }
  @Post(":networkId/orders/:orderId/decision") orderDecision(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("orderId") orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.decideOrder(authorization, networkId, orderId, body);
  }
  @Post(":networkId/orders/:orderId/payment") orderPayment(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Param("orderId") orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateOrderPayment(
      authorization,
      networkId,
      orderId,
      body,
    );
  }
  @Post(":networkId/settings") settings(
    @Headers("authorization") authorization: string | undefined,
    @Param("networkId") networkId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.networks.updateSettings(authorization, networkId, body);
  }
}
