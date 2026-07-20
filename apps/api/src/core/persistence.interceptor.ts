import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, mergeMap } from "rxjs";
import { PortalStore } from "./portal.store";

@Injectable()
export class PersistenceInterceptor implements NestInterceptor {
  constructor(private readonly store: PortalStore) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const before = this.store.snapshot();
    return next.handle().pipe(
      mergeMap(async (value) => {
        if (before !== this.store.snapshot()) await this.store.persist();
        return value;
      }),
    );
  }
}
