// src/funnel.ts
import { getGitHubFile, putGitHubFile } from "./github";

const INBOX_BASE = "Telegram/inbox";

function inboxPath(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${INBOX_BASE}/${y}-${m}-${d}.md`;
}

export async function funnelToInbox(opts: {
  text: string;
  chatId: number;
  fromId?: number;
  fromName?: string;
}): Promise<string> {
  const now = new Date();
  const timestamp = now.toISOString();

  const entry = [
    `- **${timestamp}** | chat ${opts.chatId} | @${opts.fromName ?? "unknown"} (id ${opts.fromId ?? "unknown"})`,
    `  ${opts.text.replace(/\n/g, "\n  ")}`,
    "",
  ].join("\n");

  const path = inboxPath(now);
  const existing = await getGitHubFile(path);
  await putGitHubFile(
    path,
    `${existing ?? ""}${entry}`,
    `Telegram: inbox entry ${timestamp}`
  );
  return path;
}
