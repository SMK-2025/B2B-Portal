import { Injectable } from "@nestjs/common";

@Injectable()
export class ProfilesService {
  reviewStatus(profileId: string) {
    return {
      profileId,
      status: "draft",
      publicVisibility: false,
      matchingEligible: false,
      requiredNextAction: "submit_for_review"
    } as const;
  }
}
