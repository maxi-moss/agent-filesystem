import { tool } from "ai";
import { z } from "zod";
import { getFilesystem } from "../../lib/filesystem/index.js";
import {
  formatAsyncToolResult,
  formatToolResult,
} from "../../lib/utils/formatting.js";
import {
  fetchArticleContent,
  getTopHeadlines,
  searchNews,
} from "../../features/news/service.js";

const AGENT_NAME = "news-agent";

export const newsTools = {
  cat: tool({
    description: "Read the contents of a file at PATH (absolute path).",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatToolResult(() => getFilesystem().cat(path, AGENT_NAME)),
  }),

  ls: tool({
    description:
      "List direct children of a directory (absolute path). Use to discover existing news files before writing, so duplicates can be consolidated rather than re-created.",
    inputSchema: z.object({ path: z.string().optional() }),
    execute: ({ path }) =>
      formatToolResult(() => {
        const fs = getFilesystem();
        return fs.ls(path ?? fs.getCwd(), AGENT_NAME);
      }),
  }),

  grep: tool({
    description:
      'Search file contents. args mirror "grep [-i] [-l] PATTERN [PATH]". Always use absolute paths.',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatToolResult(() => getFilesystem().grep(args, AGENT_NAME)),
  }),

  write: tool({
    description: "Create or overwrite a file at PATH with CONTENT (absolute path).",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatToolResult(() => getFilesystem().write(path, content, AGENT_NAME)),
  }),

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
