import type { ContentfulStatusCode } from "hono/utils/http-status";

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: ContentfulStatusCode;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  readonly code: string = "validation_error";
  readonly status: ContentfulStatusCode = 400;
}

export class NotFoundError extends AppError {
  readonly code: string = "not_found";
  readonly status: ContentfulStatusCode = 404;
}
