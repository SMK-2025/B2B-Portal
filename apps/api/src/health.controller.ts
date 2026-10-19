import { Controller, Get } from "@nestjs/common";
import { PortalStore } from "./core/portal.store";
import {
  RETIRE_INITIATOR_JOB,
  RESET_TEST_MEMBER_JOB,
} from "./core/retire-legacy-initiator";

@Controller("health")
export class HealthController {
  constructor(private readonly store: PortalStore) {}
  @Get()
  status() {
    return {
      status: "ok",
      testAccountReset:
        this.store.maintenanceReceipts.get(RESET_TEST_MEMBER_JOB)?.state ||
        "not_run",
      service: "portal-api",
      timestamp: new Date().toISOString(),
      maintenance:
        this.store.maintenanceReceipts.get(RETIRE_INITIATOR_JOB)?.state ||
        "not_run",
      operatorMailConfigured: Boolean(
        process.env.SENDGRID_API_KEY && process.env.MAIL_FROM_EMAIL,
      ),
      maintenanceNotification: this.store.operatorMails.get(
        RETIRE_INITIATOR_JOB,
      )?.sentAt
        ? "accepted"
        : "pending",
    };
  }
}
