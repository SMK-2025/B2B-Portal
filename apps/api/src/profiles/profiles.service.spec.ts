import { describe, expect, it } from "vitest";
import { ProfilesService } from "./profiles.service";

describe("ProfilesService", () => {
  it("keeps a draft profile private and out of matching", () => {
    const result = new ProfilesService().reviewStatus("profile-1");
    expect(result.publicVisibility).toBe(false);
    expect(result.matchingEligible).toBe(false);
  });
});
