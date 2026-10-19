import {
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { PortalStore } from "../core/portal.store";
import { EmailService } from "./email.service";
@Injectable()
export class OperatorMailService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(OperatorMailService.name);
  constructor(
    private readonly store: PortalStore,
    private readonly email: EmailService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.flush().catch(() =>
          this.logger.warn(
            "Betreiber-Mailwarteschlange konnte nicht verarbeitet werden.",
          ),
        ),
      15_000,
    );
    this.timer.unref?.();
    void this.flush().catch(() =>
      this.logger.warn(
        "Betreiber-Mailwarteschlange bleibt zur Wiederholung gespeichert.",
      ),
    );
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async flush() {
    if (this.running) return;
    this.running = true;
    try {
      const pending = [...this.store.operatorMails.values()]
        .filter((m) => !m.sentAt && Date.parse(m.nextAttemptAt) <= Date.now())
        .slice(0, 20);
      for (const record of pending) {
        record.attempts++;
        await this.store.persist();
        try {
          await this.email.sendOperatorInformation(record.subject, record.text);
          record.sentAt = new Date().toISOString();
          record.lastError = null;
        } catch {
          record.lastError =
            "Versand nicht möglich – automatische Wiederholung geplant.";
          record.nextAttemptAt = new Date(
            Date.now() +
              Math.min(3_600_000, 30_000 * 2 ** Math.min(record.attempts, 7)),
          ).toISOString();
        }
        await this.store.persist();
      }
    } finally {
      this.running = false;
    }
  }
}
