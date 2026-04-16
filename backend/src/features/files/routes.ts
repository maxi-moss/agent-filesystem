import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getFilesystem } from "../../lib/filesystem/index.js";
import type { FsChangeEvent } from "../../lib/filesystem/index.js";
import { HTTPException } from "hono/http-exception";
import { agentAccess } from "../../lib/config.js";
import { getFile, listDirectory } from "./service.js";

export const filesRoutes = new Hono();

filesRoutes.get("/access-scopes", (context) => {
  const accessScopes = Object.entries(agentAccess).map(([name, namespaces]) => ({
    name,
    namespaces,
  }));
  return context.json(accessScopes);
});

filesRoutes.get("/", (context) => {
  const path = context.req.query("path");
  const accessScope = context.req.query("accessScope");
  if (!path) throw new HTTPException(400, { message: "missing path parameter" });
  if (!accessScope) throw new HTTPException(400, { message: "missing accessScope parameter" });

  const file = getFile(path, accessScope);
  if (!file) throw new HTTPException(404, { message: `${path}: not found` });

  return context.json(file);
});

filesRoutes.get("/directory", (context) => {
  const path = context.req.query("path");
  const accessScope = context.req.query("accessScope");
  if (!path) throw new HTTPException(400, { message: "missing path parameter" });
  if (!accessScope) throw new HTTPException(400, { message: "missing accessScope parameter" });

  const children = listDirectory(path, accessScope);
  if (!children) throw new HTTPException(404, { message: `${path}: not found` });

  return context.json({ path, children });
});

filesRoutes.get("/events", (context) => {
  return streamSSE(context, async (stream) => {
    const fs = getFilesystem();

    const listener = (event: FsChangeEvent) => {
      stream.writeSSE({
        event: "change",
        data: JSON.stringify(event),
      });
    };

    fs.on("change", listener);
    stream.onAbort(() => fs.off("change", listener));

    while (true) {
      await stream.sleep(30000);
    }
  });
});
