// src/notes.ts

import { Decision, CEODecision } from "./types";
import { putGitHubFile } from "./github";

function sanitize(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function resolveFolder(
  decision: Decision,
  ceoDecision: CEODecision
): string {

  // если CEO выбрал проект
  const projectAction = ceoDecision.actions?.find(
    (a: any) => a.type === "set_project"
  );

  if (projectAction?.project) {
    return projectAction.project;
  }

  if (decision.folder && decision.folder.trim()) {
    return decision.folder.trim();
  }

  return "12_Inbox";
}

export async function createNote(
  decision: Decision,
  ceoDecision: CEODecision
): Promise<string> {

  const folder = resolveFolder(decision, ceoDecision);

  const fileName =
    sanitize(decision.title || "Новая заметка") + ".md";

  const path = `${folder}/${fileName}`;

  const entities = (decision.entities || [])
    .map(e => `- ${e.type}: ${e.name}`)
    .join("\n");

  const md = `# ${decision.title}

## Тип

${decision.type}

## Кратко

${decision.summary}

## Исходное сообщение

${decision.note}

## Сущности

${entities || "-"}

`;

  await putGitHubFile(
    path,
    md,
    `Create note: ${decision.title}`
  );

  return path;
}
