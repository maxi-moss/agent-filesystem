import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { dbConfig } from "./lib/config.js";
import { createFilesystem } from "./lib/filesystem/index.js";
import { chatRoutes } from "./features/chat/index.js";
import { filesRoutes } from "./features/files/index.js";

createFilesystem(dbConfig.path);

const app = new Hono();

app.use("/api/*", cors({ origin: "http://localhost:5173" }));
app.route("/api/chat", chatRoutes);
app.route("/api/files", filesRoutes);

app.onError((error, context) => {
  console.error("[api]", error);
  return context.json({ error: "internal server error" }, 500);
});

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`api server listening on http://localhost:${info.port}`);
});
