import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  Res,
  HttpCode,
  HttpException,
} from "@nestjs/common";
import type { IncomingMessage } from "node:http";
type Request = IncomingMessage;
type Response = {
  redirect(status: number, url: string): void;
  type(value: string): Response;
  send(value: string | Buffer): unknown;
  status(value: number): Response;
  setHeader(name: string, value: string): void;
};
import { MailingsService } from "./mailings.service";
import { PortalStore } from "../core/portal.store";

@Controller("mailings")
export class MailingsController {
  private readonly windows = new Map<
    string,
    { until: number; count: number }
  >();
  private globalWindow = { until: 0, count: 0 };
  constructor(
    private readonly service: MailingsService,
    private readonly store: PortalStore,
  ) {}
  private automated(req: Request) {
    return (
      req.method === "HEAD" ||
      !!req.headers["purpose"] ||
      !!req.headers["sec-purpose"] ||
      /bot|crawler|spider|preview|scanner|safelinks|proofpoint|barracuda/i.test(
        req.headers["user-agent"] || "",
      )
    );
  }
  private limit(key: string) {
    const now = Date.now();
    if (this.globalWindow.until < now)
      this.globalWindow = { until: now + 60000, count: 0 };
    if (++this.globalWindow.count > 2000)
      throw new HttpException("Bitte später erneut versuchen.", 429);
    if (this.windows.size > 5000)
      for (const [k, v] of this.windows)
        if (v.until < now) this.windows.delete(k);
    if (this.windows.size > 10000 && !this.windows.has(key))
      throw new HttpException("Bitte später erneut versuchen.", 429);
    let w = this.windows.get(key);
    if (!w || w.until < now) {
      w = { until: now + 60000, count: 0 };
      this.windows.set(key, w);
    }
    if (++w.count > 60)
      throw new HttpException("Bitte später erneut versuchen.", 429);
  }
  @Get("network/:id") list(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
  ) {
    return this.service.list(auth, id);
  }
  @Post("network/:id/import") import(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.importLeads(auth, id, body);
  }
  @Post("network/:id/campaign") save(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.saveCampaign(auth, id, body);
  }
  @Post("lead/:id/consent") consent(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateLead(auth, id, body);
  }
  @Post("lead/:id/delete") remove(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
  ) {
    return this.service.removeLead(auth, id);
  }
  @Get("campaign/:id/preview") preview(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
  ) {
    return this.service.preview(auth, id);
  }
  @Get("campaign/:id/report") report(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
  ) {
    return this.service.report(auth, id);
  }
  @Post("campaign/:id/test") test(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
  ) {
    return this.service.test(auth, id);
  }
  @Post("campaign/:id/send") send(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.sendBatch(auth, id, body);
  }
  @Get("public/click/:token/:link") async click(
    @Param("token") token: string,
    @Param("link") link: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.limit(token);
    const target = this.service.click(token, link, this.automated(req));
    await this.store.persist();
    res.redirect(302, target);
  }
  @Get("public/image/:token.gif") async image(
    @Param("token") token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.limit(token);
    const before = this.store.snapshot();
    if (req.method !== "HEAD") this.service.image(token, this.automated(req));
    if (before !== this.store.snapshot()) await this.store.persist();
    res
      .type("image/gif")
      .send(
        Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64",
        ),
      );
  }
  @Post("public/view") view(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    const token = String(body.token || "").slice(0, 100);
    this.limit(token);
    return this.service.view(
      token,
      String(body.path || "").slice(0, 200),
      this.automated(req),
    );
  }
  @Get("public/unsubscribe/:token") unsubscribePage(
    @Param("token") token: string,
    @Res() res: Response,
  ) {
    this.limit(token);
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
    );
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token))
      return res.status(404).send("Link ungültig.");
    return res
      .type("html")
      .send(
        `<!doctype html><html lang="de"><meta name="viewport" content="width=device-width"><title>E-Mail-Abmeldung</title><body style="font:18px Arial;padding:40px;max-width:600px;margin:auto"><h1>Keine weiteren Werbe-E-Mails?</h1><p>Die Abmeldung gilt für Werbe-Mailings von B2B Matching. Notwendige Konto- und Vertragsnachrichten bleiben davon unberührt.</p><form method="post"><button style="padding:15px">Abmeldung bestätigen</button></form></body></html>`,
      );
  }
  @Post("public/unsubscribe/:token") @HttpCode(200) async unsubscribe(
    @Param("token") token: string,
    @Res() res: Response,
  ) {
    this.limit(token);
    this.service.unsubscribe(token);
    await this.store.persist();
    res
      .type("html")
      .send(
        '<!doctype html><html lang="de"><meta name="viewport" content="width=device-width"><title>Abgemeldet</title><body style="font:18px Arial;padding:40px"><h1>Du bist abgemeldet.</h1><p>Du erhältst keine weiteren Werbe-Mailings von B2B Matching.</p></body></html>',
      );
  }
  @Post("public/webhook") @HttpCode(200) webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("x-twilio-email-event-webhook-signature")
    signature: string | undefined,
    @Headers("x-twilio-email-event-webhook-timestamp")
    timestamp: string | undefined,
  ) {
    return this.service.webhook(req.rawBody, signature, timestamp);
  }
}
