import { getGitHubFile, putGitHubFile } from "./github";
import * as yaml from "js-yaml";

export interface DocumentIndexEntry {
  title: string;
  folder: string;
  file: string;
  tags: string[];
  type: string;
  created: string;
  updated: string;
  status: string;
}

export async function readDocumentIndex(): Promise<DocumentIndexEntry[]> {
  const content = await getGitHubFile("Indexes/Document_Index.md");

  if (!content || content.trim() === "") {
    return [];
  }

  const blocks = content
    .split("---")
    .filter((b) => b.trim());

  return blocks
    .map((b) => {
      try {
        return yaml.load(b) as DocumentIndexEntry;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as DocumentIndexEntry[];
}

export async function writeDocumentIndex(
  entries: DocumentIndexEntry[]
) {
  if (entries.length === 0) {
    await putGitHubFile(
      "Indexes/Document_Index.md",
      "# Empty\n",
      "Update Document Index"
    );
    return;
  }

  const content = entries
    .map((e) => `---\n${yaml.dump(e)}`)
    .join("\n");

  await putGitHubFile(
    "Indexes/Document_Index.md",
    content,
    "Update Document Index"
  );
}

export async function updateDocumentIndex(
  notePath: string,
  decision: any
) {
  const entries = await readDocumentIndex();

  const now = new Date().toISOString();

  const existing = entries.find(
    (e) => e.file === notePath
  );

  if (existing) {
    existing.updated = now;
  } else {
    entries.push({
      title: decision.title || "",
      folder: decision.folder || "",
      file: notePath,
      tags: decision.tags || [],
      type: decision.type || "",
      created: now,
      updated: now,
      status: "active",
    });
  }

  await writeDocumentIndex(entries);
}
