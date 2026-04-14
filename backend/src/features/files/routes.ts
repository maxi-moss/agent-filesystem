import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getFilesystem } from "../../lib/filesystem/index.js";
import type { FsChangeEvent } from "../../lib/filesystem/index.js";
import { HTTPException } from "hono/http-exception";
import { getFile, listDirectory } from "./service.js";

export const filesRoutes = new Hono();

filesRoutes.get("/", (context) => {
  const path = context.req.query("path");
  if (!path) throw new HTTPException(400, { message: "missing path parameter" });

  const file = getFile(path);
  if (!file) throw new HTTPException(404, { message: `${path}: not found` });

  return context.json(file);
});

filesRoutes.get("/directory", (context) => {
  const path = context.req.query("path");
  if (!path) throw new HTTPException(400, { message: "missing path parameter" });

  const children = listDirectory(path);
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
