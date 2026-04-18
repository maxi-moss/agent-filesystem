import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { newsConfig } from "../../lib/config.js";
import {
  ArticleExtractionError,
  ArticleFetchError,
  GNewsApiError,
  GNewsConfigError,
} from "./errors.js";

const GNEWS_BASE_URL = "https://gnews.io/api/v4";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type GNewsArticle = {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
};

export type GNewsResponse = {
  totalArticles: number;
  articles: GNewsArticle[];
};

export type SearchNewsParams = {
  q: string;
  country?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

export type TopHeadlinesParams = {
  q?: string | undefined;
  category?: string | undefined;
  country?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

/** Search news articles matching the query filters. */
export async function searchNews(params: SearchNewsParams): Promise<GNewsResponse> {
  const apiKey = requireApiKey();
  const url = buildGNewsUrl("/search", apiKey, {
    q: params.q,
    country: params.country,
    from: params.from,
    to: params.to,
    max: String(newsConfig.searchMax),
  });
  return fetchGNews(url);
}

/** Fetch the current top headlines matching the given filters. */
export async function getTopHeadlines(params: TopHeadlinesParams): Promise<GNewsResponse> {
  const apiKey = requireApiKey();
  const url = buildGNewsUrl("/top-headlines", apiKey, {
    q: params.q,
    category: params.category,
    country: params.country,
    from: params.from,
    to: params.to,
    max: String(newsConfig.headlinesMax),
  });
  return fetchGNews(url);
}

/** Fetch an article URL and extract its main readable text content. */
export async function fetchArticleContent(articleUrl: string): Promise<{ textContent: string }> {
  const articleResponse = await fetch(articleUrl, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
  });
  if (!articleResponse.ok) {
    throw new ArticleFetchError(`article fetch failed: ${articleResponse.status}`);
  }
  const articleHtml = await articleResponse.text();
  const articleDom = new JSDOM(articleHtml, { url: articleUrl });
  const articleContent = new Readability(articleDom.window.document).parse();
  if (!articleContent?.textContent) {
    throw new ArticleExtractionError("failed to extract article content");
  }
  return { textContent: articleContent.textContent };
}

function requireApiKey(): string {
  if (!newsConfig.apiKey) {
    throw new GNewsConfigError("GNEWS_API_KEY is not configured");
  }
  return newsConfig.apiKey;
}

function buildGNewsUrl(
  endpoint: string,
  apiKey: string,
  params: Record<string, string | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, value);
  }
  searchParams.set("apikey", apiKey);
  return `${GNEWS_BASE_URL}${endpoint}?${searchParams.toString()}`;
}

async function fetchGNews(url: string): Promise<GNewsResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new GNewsApiError(`GNews request failed: ${response.status}`);
  }
  const data: GNewsResponse = await response.json();
  return data;
}
