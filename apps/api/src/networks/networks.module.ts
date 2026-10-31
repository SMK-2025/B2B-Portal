import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NetworksController } from "./networks.controller";
import { NetworksService } from "./networks.service";
import { HomepagePublicationController } from "./homepage-publication.controller";
import { AutomaticBillingService } from "./automatic-billing.service";

@Module({
  imports: [AuthModule],
  controllers: [HomepagePublicationController, NetworksController],
  providers: [NetworksService, AutomaticBillingService],
  exports: [NetworksService, AutomaticBillingService],
})
export class NetworksModule {}
