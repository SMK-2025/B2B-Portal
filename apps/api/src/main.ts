import { createPortalApp } from "./bootstrap";
void createPortalApp().then((app) =>
  app.listen(Number(process.env.PORT ?? process.env.API_PORT ?? 3001)),
);
