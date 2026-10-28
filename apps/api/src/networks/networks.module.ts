import {Module} from "@nestjs/common";
import {AuthModule} from "../auth/auth.module";
import {NetworksController} from "./networks.controller";
import {NetworksService} from "./networks.service";
import {HomepagePublicationController} from "./homepage-publication.controller";

@Module({imports:[AuthModule],controllers:[HomepagePublicationController,NetworksController],providers:[NetworksService],exports:[NetworksService]})
export class NetworksModule{}
