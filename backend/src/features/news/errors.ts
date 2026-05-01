import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../../lib/errors.js";

export class GNewsApiError extends AppError {
  readonly code = "news/gnews_failed";
  readonly status: ContentfulStatusCode = 502;
}

export class ArticleFetchError extends AppError {
  readonly code = "news/article_fetch_failed";
  readonly status: ContentfulStatusCode = 502;
}

export class ArticleExtractionError extends AppError {
  readonly code = "news/article_extraction_failed";
  readonly status: ContentfulStatusCode = 502;
}
