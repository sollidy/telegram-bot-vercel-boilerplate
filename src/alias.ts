// src/alias.ts
import { getGitHubFile, putGitHubFile } from './github';

export async function loadAliasIndex(): Promise<Map<string, string>> {
  const content = await getGitHubFile('Indexes/Alias_Index.md');
  if (!content || content.trim() === '') {
    return new Map();
  }
  const lines = content.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
  const map = new Map<string, string>();
  for (const line of lines) {
    const [canonical, ...aliases] = line.split(':').map(s => s.trim());
    if (!canonical) continue;
    for (const alias of aliases) {
      if (alias) map.set(alias.toLowerCase(), canonical);
    }
    map.set(canonical.toLowerCase(), canonical); // сам канонический тоже
  }
  return map;
}

export async function normalizeText(text: string): Promise<string> {
  const aliasMap = await loadAliasIndex();
  const words = text.split(/\s+/);
  const normalized = words.map(word => {
    const lower = word.toLowerCase();
    return aliasMap.get(lower) || word;
  });
  return normalized.join(' ');
}
