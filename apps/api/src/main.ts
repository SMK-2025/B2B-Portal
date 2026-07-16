import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true });
  app.setGlobalPrefix("api", { exclude: ["health"] });
  await app.listen(Number(process.env.PORT ?? process.env.API_PORT ?? 3001));
}

void bootstrap();
