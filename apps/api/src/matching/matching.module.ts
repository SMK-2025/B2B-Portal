import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MatchingController } from "./matching.controller";
import { MatchingService } from "./matching.service";
import { NeedsService } from "./needs.service";
import { OpenAiMatchingService } from "./openai-matching.service";

@Module({
  imports: [AuthModule],
  controllers: [MatchingController],
  providers: [MatchingService, NeedsService, OpenAiMatchingService],
  exports: [MatchingService, NeedsService],
})
export class MatchingModule {}
