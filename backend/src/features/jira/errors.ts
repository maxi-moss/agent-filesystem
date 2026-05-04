import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../../lib/errors.js";

export class JiraSignatureError extends AppError {
  readonly code = "jira/invalid_signature";
  readonly status: ContentfulStatusCode = 401;
}

export class JiraPayloadError extends AppError {
  readonly code = "jira/invalid_payload";
  readonly status: ContentfulStatusCode = 400;
}
