import { Hono } from "hono";
import { ValidationError } from "../../lib/errors.js";
import { fetchArticleContent, getTopHeadlines, searchNews } from "./service.js";

export const newsRoutes = new Hono();

newsRoutes.get("/search", async (context) => {
  const q = context.req.query("q");
  if (!q) throw new ValidationError("missing q parameter");
  const country = context.req.query("country");
  const from = context.req.query("from");
  const to = context.req.query("to");
  const response = await searchNews({ q, country, from, to });
  return context.json(response);
});

newsRoutes.get("/top-headlines", async (context) => {
  const q = context.req.query("q");
  const category = context.req.query("category");
  const country = context.req.query("country");
  const from = context.req.query("from");
  const to = context.req.query("to");
  const response = await getTopHeadlines({ q, category, country, from, to });
  return context.json(response);
});

newsRoutes.post("/article", async (context) => {
  const body = await context.req.json<{ articleUrl?: string }>();
  if (!body.articleUrl) {
    throw new ValidationError("missing articleUrl");
  }
  const response = await fetchArticleContent(body.articleUrl);
  return context.json(response);
});
