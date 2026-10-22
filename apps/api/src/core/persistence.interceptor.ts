import {
  CallHandler,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, mergeMap } from "rxjs";
import { PortalStore } from "./portal.store";
import { tokenHash } from "../auth/password";

@Injectable()
export class PersistenceInterceptor implements NestInterceptor {
  constructor(private readonly store: PortalStore) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = _context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;
    if (
      typeof authorization === "string" &&
      authorization.startsWith("Bearer ")
    ) {
      const session = this.store.sessions.get(
        tokenHash(authorization.slice(7)),
      );
      const user =
        session && Date.parse(session.expiresAt) > Date.now()
          ? this.store.users.get(session.userId)
          : undefined;
      if (user?.visitorNetworkId) {
        const path = String(request.path || request.url).split("?")[0];
        const securityRead = /\/auth\/(session\/check|account)$/.test(path);
        if (
          !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
          !securityRead
        )
          throw new ForbiddenException(
            "Besucherzugang: Nur ansehen. Änderungen, Buchungen, Nachrichten und Kommentare sind nicht erlaubt.",
          );
        if (
          request.params?.networkId &&
          request.params.networkId !== user.visitorNetworkId
        )
          throw new ForbiddenException(
            "Dieser Besucherzugang gilt nur für das zugewiesene Netzwerk.",
          );
      }
    }
    const before = this.store.snapshot();
    return next.handle().pipe(
      mergeMap(async (value) => {
        if (before !== this.store.snapshot()) await this.store.persist();
        return value;
      }),
    );
  }
}
