import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { OperatorMailService } from "./operator-mail.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailService, OperatorMailService],
  exports: [AuthService, EmailService, OperatorMailService],
})
export class AuthModule {}
