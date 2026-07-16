import { Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post("register") register(@Body() body: Record<string, unknown>) { return this.auth.register(body); }
  @Post("verify-email") verifyEmail(@Body("token") token: unknown) { return this.auth.verifyEmail(token); }
  @Post("login") login(@Body() body: Record<string, unknown>) { return this.auth.login(body); }
  @Post("session/check") check(@Headers("authorization") authorization?: string) { const user = this.auth.authenticate(authorization); return { userId: user.id, valid: true }; }
}
