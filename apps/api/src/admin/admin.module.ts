import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { ServicesModule } from "../services/services.module";
@Module({imports:[AuthModule,ServicesModule],controllers:[AdminController],providers:[AdminService]}) export class AdminModule{}
