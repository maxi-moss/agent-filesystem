import { NotFoundError } from "../../lib/errors.js";

export class FileNotFoundError extends NotFoundError {
  override readonly code: string = "files/not_found";
}
