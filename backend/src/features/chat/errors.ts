import { ValidationError } from "../../lib/errors.js";

export class InvalidChatMessagesError extends ValidationError {
  override readonly code: string = "chat/messages_required";
}
