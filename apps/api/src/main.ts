import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (
    process.env.WEB_ORIGINS ??
    process.env.WEB_ORIGIN ??
    "http://localhost:3000"
  )
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
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
  await app.listen(Number(process.env.PORT ?? process.env.API_PORT ?? 3001));
}

void bootstrap();
