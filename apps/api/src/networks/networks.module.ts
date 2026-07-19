import {Module} from "@nestjs/common";
import {AuthModule} from "../auth/auth.module";
import {NetworksController} from "./networks.controller";
import {NetworksService} from "./networks.service";

@Module({imports:[AuthModule],controllers:[NetworksController],providers:[NetworksService],exports:[NetworksService]})
export class NetworksModule{}
