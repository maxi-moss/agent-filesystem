import { tool } from "ai";
import { z } from "zod";
import { getCommands } from "../../lib/commands/index.js";
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

const grepSchema = z.object({
  pattern: z.string(),
  path: z.string().optional(),
  "-i": z.boolean().optional(),
  "-A": z.number().int().nonnegative().optional(),
  "-B": z.number().int().nonnegative().optional(),
  "-C": z.number().int().nonnegative().optional(),
  output_mode: z.enum(["content", "files_with_matches", "count"]).optional(),
  head_limit: z.number().int().positive().optional(),
});

const findSchema = z.object({
  path: z.string(),
  namePattern: z.string().optional(),
  mtimeWithinDays: z.number().int().nonnegative().optional(),
  mtimeOlderThanDays: z.number().int().nonnegative().optional(),
});

export const newsTools = {
  cat: tool({
    description: "Read the contents of a file at PATH (absolute path).",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatToolResult(() => getCommands().cat(path, AGENT_NAME)),
  }),

  ls: tool({
    description:
      "List direct children of a directory (absolute path). Each line is `{updated-iso}  {name}`, sorted by most-recently-updated first. Subdirectory timestamps reflect the freshest file inside the subtree. Use to discover existing topics before writing, so duplicates can be consolidated rather than re-created.",
    inputSchema: z.object({ path: z.string().optional() }),
    execute: ({ path }) =>
      formatToolResult(() => {
        const commands = getCommands();
        return commands.ls(path ?? commands.getCwd(), AGENT_NAME);
      }),
  }),

  find: tool({
    description:
      "Find files under PATH (absolute path). Each line is `{updated-iso}  {path}`. `namePattern` filters basenames by glob. `mtimeWithinDays: N` keeps files updated within the last N days (use to surface today's freshly-touched briefings); `mtimeOlderThanDays: N` keeps files older than N days (mutually exclusive).",
    inputSchema: findSchema,
    execute: (opts) => formatToolResult(() => getCommands().find(opts, AGENT_NAME)),
  }),

  grep: tool({
    description:
      "Search file contents for PATTERN under PATH (absolute path). Returns matched lines as `path:line:content`. Set `-i` for case-insensitive search. `-A`/`-B`/`-C` add N lines of after/before/around context. `output_mode` can be `content` (default), `files_with_matches`, or `count`. `head_limit` caps output lines.",
    inputSchema: grepSchema,
    execute: (opts) => formatToolResult(() => getCommands().grep(opts, AGENT_NAME)),
  }),

  write: tool({
    description: "Create or overwrite a file at PATH with CONTENT (absolute path).",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatToolResult(() => getCommands().write(path, content, AGENT_NAME)),
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
