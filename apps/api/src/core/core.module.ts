import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PortalStore } from "./portal.store";
import { PersistenceInterceptor } from "./persistence.interceptor";

@Global()
@Module({
  providers: [
    PortalStore,
    { provide: APP_INTERCEPTOR, useClass: PersistenceInterceptor },
  ],
  exports: [PortalStore],
})
export class CoreModule {}
