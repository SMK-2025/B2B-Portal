import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import type { IncomingMessage, ServerResponse } from "node:http";

export async function createPortalApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // Einzeldateien bleiben anwendungsseitig begrenzt. Veranstaltungsrückblicke
  const attempts = new Map<string, { count: number; until: number }>();
  app.use(
    (
      req: IncomingMessage & { ip?: string },
      res: ServerResponse,
      next: () => void,
    ) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Cache-Control", "private, no-store");
      if (
        req.method === "POST" &&
        /^\/api\/(?:auth\/(?:login(?:\/code)?|password-reset\/request|register|account\/mfa)|networks\/participation\/request)\/?(?:\?|$)/i.test(
          req.url || "",
        )
      ) {
        const now = Date.now(),
          key = req.ip || req.socket.remoteAddress || "unknown";
        let window = attempts.get(key);
        if (!window || window.until <= now) {
          if (attempts.size >= 5000)
            for (const [k, v] of attempts)
              if (v.until <= now) attempts.delete(k);
          if (attempts.size >= 10000 && !window) {
            res.statusCode = 429;
            res.end();
            return;
          }
          window = { count: 0, until: now + 60000 };
          attempts.set(key, window);
        }
        if (++window.count > 30) {
          res.statusCode = 429;
          res.setHeader("Retry-After", "60");
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message:
                "Zu viele Versuche. Bitte nach einer Minute erneut versuchen.",
            }),
          );
          return;
        }
      }
      next();
    },
  );
  // dürfen sechs Bilder enthalten; Base64-Overhead wird hier berücksichtigt.
  app.useBodyParser("json", { limit: "16mb" });
  app.useBodyParser("urlencoded", { limit: "16mb", extended: true });
  const originConfiguration =
    process.env.WEB_ORIGINS ??
    process.env.WEB_ORIGIN ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  const allowedOrigins = originConfiguration
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (!allowedOrigins.length) {
    throw new Error("WEB_ORIGINS muss für den Produktivbetrieb gesetzt sein.");
  }
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, "")))
        return callback(null, true);
      return callback(
        new Error("Origin ist für diese API nicht freigegeben."),
        false,
      );
    },
    credentials: true,
  });
  app.enableShutdownHooks();
  const express = app.getHttpAdapter().getInstance() as {
    set(name: string, value: unknown): void;
  };
  express.set("trust proxy", 1);
  app.setGlobalPrefix("api", { exclude: ["health"] });
  return app;
}
