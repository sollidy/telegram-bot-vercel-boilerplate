// src/registry.ts

import { getGitHubFile, putGitHubFile } from './github';
import * as yaml from 'js-yaml';

function safeParseYaml(content: string): any[] {
  if (!content) return [];

  const docs = content
    .split(/^---$/gm)
    .map(doc => doc.trim())
    .filter(doc => doc.length > 0);

  const result: any[] = [];

  for (const doc of docs) {
    try {
      const parsed = yaml.load(doc);

      if (
        parsed &&
        typeof parsed === 'object' &&
        !(parsed as any).type && // пропускаем Entities.md
        !(parsed as any).description?.startsWith?.('Список')
      ) {
        result.push(parsed);
      }
    } catch {
      // молча пропускаем служебные блоки
    }
  }

  return result;
}

export async function readRegistryFile(fileName: string): Promise<any[]> {
  try {
    const content = await getGitHubFile(`Registry/${fileName}`);

    if (!content) return [];

    return safeParseYaml(content);

  } catch (e) {
    console.warn(`Registry/${fileName} not found`);
    return [];
  }
}

export async function writeRegistryFile(
  fileName: string,
  entries: any[],
  commitMessage: string
): Promise<void> {

  const content = entries
    .map(entry => `---\n${yaml.dump(entry)}`)
    .join('\n');

  await putGitHubFile(
    `Registry/${fileName}`,
    content,
    commitMessage
  );
}

export async function getProjects() {
  return readRegistryFile('Projects.md');
}

export async function getPeople() {
  return readRegistryFile('People.md');
}

export async function getAgents() {
  return readRegistryFile('Agents.md');
}

export async function addProject(project: any) {
  const list = await getProjects();
  list.push(project);
  await writeRegistryFile(
    'Projects.md',
    list,
    `Add project: ${project.name}`
  );
}

export async function addPerson(person: any) {
  const list = await getPeople();
  list.push(person);
  await writeRegistryFile(
    'People.md',
    list,
    `Add person: ${person.name}`
  );
}

export async function addAgent(agent: any) {
  const list = await getAgents();
  list.push(agent);
  await writeRegistryFile(
    'Agents.md',
    list,
    `Add agent: ${agent.name}`
  );
}
