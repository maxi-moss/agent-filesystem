import { tool } from "ai";
import { z } from "zod";
import { formatAsyncToolResult } from "../../lib/utils/formatting.js";
import { filesystemTools } from "../../lib/tools/filesystem-tools.js";
import {
  fetchArticleContent,
  getTopHeadlines,
  searchNews,
} from "../../features/news/service.js";

const AGENT_NAME = "news-agent";

export const newsTools = {
  cat: filesystemTools.cat(AGENT_NAME),
  ls: filesystemTools.ls(AGENT_NAME),
  find: filesystemTools.find(AGENT_NAME),
  grep: filesystemTools.grep(AGENT_NAME),
  write: filesystemTools.write(AGENT_NAME),

  searchNews: tool({
    description:
      "Search news articles by free-text query, optionally filtered by country (ISO 3166-1 alpha-2) and ISO date range. Returns titles, descriptions, sources, urls, and publish times.",
    inputSchema: z.object({
      q: z.string(),
      country: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
    execute: ({ q, country, from, to }) =>
      formatAsyncToolResult(async () =>
        JSON.stringify(await searchNews({ q, country, from, to })),
      ),
  }),

  topHeadlinesToday: tool({
    description:
      "Fetch today's top headlines, optionally narrowed by category, country (ISO 3166-1 alpha-2), or free-text query.",
    inputSchema: z.object({
      q: z.string().optional(),
      category: z.string().optional(),
      country: z.string().optional(),
    }),
    execute: ({ q, category, country }) =>
      formatAsyncToolResult(async () => {
        const from = startOfTodayIso();
        return JSON.stringify(await getTopHeadlines({ q, category, country, from }));
      }),
  }),

  getFullArticle: tool({
    description:
      "Fetch and extract the main readable text of an article at URL. Use after searchNews/topHeadlinesToday to read full content beyond the snippet.",
    inputSchema: z.object({ url: z.string() }),
    execute: ({ url }) =>
      formatAsyncToolResult(async () => {
        const { textContent } = await fetchArticleContent(url);
        return textContent;
      }),
  }),
};

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}
