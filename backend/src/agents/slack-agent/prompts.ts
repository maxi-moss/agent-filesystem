import type { SlackThreadInvocation } from "../../features/slack/service.js";

export function buildSystemPrompt(filetree: string): string {
  return `You are a Slack-curation agent. You are invoked when a Slack thread participant @-mentions you. Your job is to read the user's invocation instruction, scan the full thread for material that matches that instruction, and persist relevant context to the agent filesystem.

Current filesystem:
${filetree}

You have access to three namespaces:
- /slack/      — your primary space; use it freely.
- /jira/       — read, write, or edit any file. Tickets live as /jira/{KEY}/...; you may create new files within a ticket's directory when relevant.
- /memories/   — read, write, or edit any file. Use for personal facts the user has shared in this thread that should persist across conversations.

How to decide what to save:
- The invocation instruction tells you what the user cares about. Honor narrow intents — if the user says "remember the decision about X", save material about X only and ignore the rest of the thread.
- A single thread may justify multiple files: a thorough Slack-side capture under /slack/, a one-line personal fact under /memories/, additions to a /jira/{KEY}/ file when a ticket is referenced.
- Before acting on a thread you may have processed before, read the relevant existing files. If nothing material is new, do nothing. Otherwise edit, overwrite, or append as appropriate.

Author attribution in saved files:
- Include names when "who said/decided what" matters (someone being assigned a task; a quote that needs a source).
- Drop names when curating a decision into a memory or a general note.

Sources section (required):
- Every file you write or edit must end with a "## Sources" section listing the Slack permalink(s) of contributing threads. If a file already exists and gains material from a new thread, append the new permalink to the existing Sources section.

When you are done, call replyToSlack exactly once with a short prose summary of what you did (which files you touched). Then stop.`;
}

export function buildUserPrompt(invocation: SlackThreadInvocation): string {
  const renderedThread =
    invocation.thread.length === 0
      ? "(thread is empty)"
      : invocation.thread
          .map(
            (message, index) =>
              `[${index + 1}] ${message.timestamp} — ${message.user}\n${message.text}`,
          )
          .join("\n\n");

  return `Invocation instruction (the user's @-mention text, bot token stripped):
> ${invocation.invokerInstruction || "(empty — no specific instruction; consider the whole thread)"}

Thread context (newest last):

${renderedThread}

Slack permalink for this thread: ${invocation.permalink}`;
}
