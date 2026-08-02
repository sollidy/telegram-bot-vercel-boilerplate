import axios from 'axios';
import { Decision, Entity } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function analyzeMessage(text: string): Promise<Decision> {
  const prompt = `
Ты — Архивариус TOS. Проанализируй сообщение пользователя и верни JSON.

Формат:
{
  "entities": [
    { "type": "person", "name": "Имя" },
    { "type": "project", "name": "Название проекта" },
    { "type": "technology", "name": "Технология" },
    ...
  ],
  "title": "Краткий заголовок до 5 слов",
  "folder": "Одна из папок (00_CEO, 01_Фермы, ...) или пустая строка, если не уверен",
  "type": "идея|задача|решение|проект|человек|факт|инструкция|исследование|встреча|документ",
  "summary": "Краткое описание (одно предложение)",
  "confidence": 0.95,
  "needConfirmation": false,
  "note": "Полный текст сообщения"
}

Правила:
- entities — массив сущностей, извлечённых из сообщения (люди, проекты, технологии, компании и т.д.).
- Если сущность не определена — не добавляй.
- Всегда возвращай только JSON.

Сообщение: ${text}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  let res;

try {
  res = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
  });
} catch (err: any) {
  console.error(
    JSON.stringify(err.response?.data, null, 2)
  );
  throw err;
}

  const raw = res.data.candidates[0].content.parts[0].text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Не удалось извлечь JSON');
  return JSON.parse(jsonMatch[0]);
}
