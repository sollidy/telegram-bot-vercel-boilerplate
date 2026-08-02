import axios from "axios";
import { Decision, CEODecision } from "./types";
import { getGitHubFile } from "./github";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function callCEO(
  decision: Decision,
  registryData: any,
 userAnswer?: string
): Promise<CEODecision> {
  const systemPrompt = await getCEOSystemPrompt();

  const prompt = `
${systemPrompt}

=== РЕЕСТР ===

Проекты:
${JSON.stringify(registryData.projects, null, 2)}

Люди:
${JSON.stringify(registryData.people, null, 2)}

Агенты:
${JSON.stringify(registryData.agents, null, 2)}

=== СООБЩЕНИЕ ===

${JSON.stringify(decision, null, 2)}

${userAnswer ? `Ответ пользователя: ${userAnswer}` : ""}

Верни ТОЛЬКО JSON.

Формат:

{
  "decision":"USE_EXISTING_PROJECT",
  "message":"...",
  "actions":[]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const res = await axios.post(url, {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ]
  });

  const raw = res.data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const json = raw.match(/\{[\s\S]*\}/);

  if (!json) {
    throw new Error("CEO вернул не JSON");
  }

  return JSON.parse(json[0]);
}

async function getCEOSystemPrompt(): Promise<string> {
  try {
    const prompt = await getGitHubFile(
      "10_Agents/000_CEO/System_Prompt.md"
    );

    if (prompt && prompt.trim()) {
      return prompt;
    }
  } catch {}

  return `
Ты — CEO TOS.

Твоя задача:
- выбрать проект;
- определить папку;
- принять решение о сохранении;
- не задавать вопросы, если они уже были решены пользователем.

Всегда возвращай только JSON.
`;
}
