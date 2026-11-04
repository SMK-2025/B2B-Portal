import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailingsService } from "./mailings.service";
import { MailingsController } from "./mailings.controller";
@Module({
  imports: [AuthModule],
  providers: [MailingsService],
  controllers: [MailingsController],
})
export class MailingsModule {}
