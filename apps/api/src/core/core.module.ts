import { Global, Module } from "@nestjs/common";
import { PortalStore } from "./portal.store";

@Global()
@Module({ providers: [PortalStore], exports: [PortalStore] })
export class CoreModule {}
