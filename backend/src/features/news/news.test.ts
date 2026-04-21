import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    apiKey: "test-key" as string | undefined,
    searchMax: 10,
    headlinesMax: 5,
  },
}));

vi.mock("../../lib/config.js", () => ({
  newsConfig: mocks.config,
}));

import { fetchArticleContent, getTopHeadlines, searchNews } from "./service.js";
import type { GNewsResponse } from "./service.js";
import {
  ArticleExtractionError,
  ArticleFetchError,
  GNewsApiError,
  GNewsConfigError,
} from "./errors.js";
import { newsTools } from "./tools.js";

const emptyGNewsBody: GNewsResponse = { totalArticles: 0, articles: [] };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

function articleHtml(paragraph: string): string {
  const body = Array.from({ length: 6 }, () => `<p>${paragraph}</p>`).join("");
  return `<!DOCTYPE html><html><head><title>Test Article</title></head><body><article><h1>Test Article</h1>${body}</article></body></html>`;
}

beforeEach(() => {
  mocks.config.apiKey = "test-key";
  mocks.config.searchMax = 10;
  mocks.config.headlinesMax = 5;
  vi.unstubAllGlobals();
});

function firstFetchUrl(fetchSpy: ReturnType<typeof vi.fn>): URL {
  const call = fetchSpy.mock.calls[0] ?? [];
  return new URL(call[0]);
}

describe("searchNews", () => {
  it("builds a search URL with all params and the configured search max", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(emptyGNewsBody));
    vi.stubGlobal("fetch", fetchSpy);

    await searchNews({
      q: "climate",
      country: "us",
      from: "2026-04-01T00:00:00Z",
      to: "2026-04-18T00:00:00Z",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const requestedUrl = firstFetchUrl(fetchSpy);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe("https://gnews.io/api/v4/search");
    expect(requestedUrl.searchParams.get("q")).toBe("climate");
    expect(requestedUrl.searchParams.get("country")).toBe("us");
    expect(requestedUrl.searchParams.get("from")).toBe("2026-04-01T00:00:00Z");
    expect(requestedUrl.searchParams.get("to")).toBe("2026-04-18T00:00:00Z");
    expect(requestedUrl.searchParams.get("max")).toBe("10");
    expect(requestedUrl.searchParams.get("apikey")).toBe("test-key");
  });

  it("omits undefined query params", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(emptyGNewsBody));
    vi.stubGlobal("fetch", fetchSpy);

    await searchNews({ q: "climate" });

    const requestedUrl = firstFetchUrl(fetchSpy);
    expect(requestedUrl.searchParams.has("country")).toBe(false);
    expect(requestedUrl.searchParams.has("from")).toBe(false);
    expect(requestedUrl.searchParams.has("to")).toBe(false);
  });

  it("returns the parsed GNews response body", async () => {
    const body: GNewsResponse = {
      totalArticles: 1,
      articles: [
        {
          title: "Headline",
          description: "desc",
          content: "snippet",
          url: "https://example.com/a",
          image: null,
          publishedAt: "2026-04-18T00:00:00Z",
          source: { name: "Example", url: "https://example.com" },
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(body)));

    const result = await searchNews({ q: "anything" });

    expect(result).toEqual(body);
  });

  it("throws GNewsConfigError when GNEWS_API_KEY is not configured", async () => {
    mocks.config.apiKey = undefined;
    vi.stubGlobal("fetch", vi.fn());

    await expect(searchNews({ q: "anything" })).rejects.toBeInstanceOf(GNewsConfigError);
  });

  it("throws GNewsApiError when the upstream response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ errors: ["bad"] }, 500)));

    await expect(searchNews({ q: "anything" })).rejects.toBeInstanceOf(GNewsApiError);
  });
});

describe("getTopHeadlines", () => {
  it("builds a top-headlines URL with category and the configured headlines max", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(emptyGNewsBody));
    vi.stubGlobal("fetch", fetchSpy);

    await getTopHeadlines({ category: "technology", country: "gb" });

    const requestedUrl = firstFetchUrl(fetchSpy);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe("https://gnews.io/api/v4/top-headlines");
    expect(requestedUrl.searchParams.get("category")).toBe("technology");
    expect(requestedUrl.searchParams.get("country")).toBe("gb");
    expect(requestedUrl.searchParams.get("max")).toBe("5");
  });

  it("throws GNewsConfigError when GNEWS_API_KEY is not configured", async () => {
    mocks.config.apiKey = undefined;
    vi.stubGlobal("fetch", vi.fn());

    await expect(getTopHeadlines({})).rejects.toBeInstanceOf(GNewsConfigError);
  });

  it("throws GNewsApiError when the upstream response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 429)));

    await expect(getTopHeadlines({})).rejects.toBeInstanceOf(GNewsApiError);
  });
});

describe("fetchArticleContent", () => {
  it("returns the textContent extracted by Readability", async () => {
    const paragraph =
      "The committee released its findings yesterday evening, outlining new standards for environmental reporting across the industry.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(htmlResponse(articleHtml(paragraph))),
    );

    const result = await fetchArticleContent("https://example.com/article");

    expect(result.textContent).toContain(paragraph);
  });

  it("sends a browser User-Agent header", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(htmlResponse(articleHtml("Enough body text to satisfy Readability heuristics when repeated.")));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchArticleContent("https://example.com/article");

    const call = fetchSpy.mock.calls[0] ?? [];
    const init: RequestInit | undefined = call[1];
    const rawHeaders = init?.headers;
    if (!rawHeaders || rawHeaders instanceof Headers || Array.isArray(rawHeaders)) {
      throw new Error("expected headers to be a plain record");
    }
    expect(rawHeaders["User-Agent"]).toMatch(/Mozilla/);
  });

  it("throws ArticleFetchError when the upstream response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("forbidden", 403)));

    await expect(fetchArticleContent("https://example.com/article")).rejects.toBeInstanceOf(
      ArticleFetchError,
    );
  });

  it("throws ArticleExtractionError when Readability cannot extract content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(htmlResponse("<!DOCTYPE html><html><body></body></html>")),
    );

    await expect(fetchArticleContent("https://example.com/article")).rejects.toBeInstanceOf(
      ArticleExtractionError,
    );
  });
});

describe("newsTools", () => {
  it("exposes the filesystem and news-fetching tools", () => {
    expect(Object.keys(newsTools).sort()).toEqual([
      "cat",
      "getFullArticle",
      "grep",
      "ls",
      "searchNews",
      "topHeadlinesToday",
      "write",
    ]);
  });

  it("does not expose write-adjacent navigation tools the agent shouldn't need", () => {
    const keys = Object.keys(newsTools);
    expect(keys).not.toContain("cd");
    expect(keys).not.toContain("find");
  });
});
