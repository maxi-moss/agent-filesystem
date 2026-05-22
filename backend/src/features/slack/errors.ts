import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../../lib/errors.js";

export class SlackSignatureError extends AppError {
  readonly code = "slack/invalid_signature";
  readonly status: ContentfulStatusCode = 401;
}

export class SlackPayloadError extends AppError {
  readonly code = "slack/invalid_payload";
  readonly status: ContentfulStatusCode = 400;
}
