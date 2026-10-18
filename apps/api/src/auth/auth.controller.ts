import { Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post("account") account(@Headers("authorization") authorization?: string) {
    return this.auth.account(authorization);
  }
  @Post("password/change") changePassword(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.changePassword(authorization, body);
  }
  @Post("email-change/request") requestEmailChange(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.requestEmailChange(authorization, body);
  }
  @Post("email-change/confirm") confirmEmailChange(
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.confirmEmailChange(body);
  }
  @Post("email-change/cancel") cancelEmailChange(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.cancelEmailChange(authorization, body);
  }
  @Post("register") register(@Body() body: Record<string, unknown>) {
    return this.auth.register(body, true);
  }
  @Post("verify-email") verifyEmail(@Body("token") token: unknown) {
    return this.auth.verifyEmail(token);
  }
  @Post("login") login(@Body() body: Record<string, unknown>) {
    return this.auth.login(body);
  }
  @Post("password-reset/request") requestPasswordReset(
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.requestPasswordReset(body);
  }
  @Post("password-reset/confirm") resetPassword(
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.resetPassword(body);
  }
  @Post("session/check") check(
    @Headers("authorization") authorization?: string,
  ) {
    const user = this.auth.authenticate(authorization);
    return {
      userId: user.id,
      accountRole: user.accountRole,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      valid: true,
    };
  }
}
