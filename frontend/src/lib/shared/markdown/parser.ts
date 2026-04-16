import { Marked } from "marked";
import DOMPurify from "dompurify";

const marked = new Marked({
  breaks: true,
  gfm: true,
});

export function parseMarkdown(source: string): string {
  const raw = marked.parse(source);
  if (typeof raw !== "string") return "";
  return DOMPurify.sanitize(raw);
}
