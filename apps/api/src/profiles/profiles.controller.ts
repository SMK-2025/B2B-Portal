import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ProfilesService } from "./profiles.service";

@Controller("profiles")
export class ProfilesController {
  constructor(@Inject(ProfilesService) private readonly profiles: ProfilesService) {}

  @Get(":id/review-status")
  reviewStatus(@Param("id") id: string) {
    return this.profiles.reviewStatus(id);
  }
}
