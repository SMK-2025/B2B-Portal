import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AuthModule } from "./auth/auth.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { CoreModule } from "./core/core.module";
import { NetworksModule } from "./networks/networks.module";
import { MailingsModule } from "./mailings/mailings.module";

@Module({
  imports: [
    CoreModule,
    AuthModule,
    OrganizationsModule,
    NetworksModule,
    MailingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
