import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ProfilesModule } from "./profiles/profiles.module";
import { AuthModule } from "./auth/auth.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { AdminModule } from "./admin/admin.module";
import { CoreModule } from "./core/core.module";
import { ServicesModule } from "./services/services.module";
import { MatchingModule } from "./matching/matching.module";
import { CollaborationModule } from "./collaboration/collaboration.module";
import {NetworksModule} from "./networks/networks.module";

@Module({ imports: [CoreModule, ProfilesModule, AuthModule, OrganizationsModule, NetworksModule, ServicesModule, MatchingModule, CollaborationModule, AdminModule], controllers: [HealthController] })
export class AppModule {}
