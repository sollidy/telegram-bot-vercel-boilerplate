// src/ceoRules.ts
import { Decision, CEODecision } from './types';

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findMatchingProject(
  name: string,
  projects: any[]
): { exact: any | null; similar: any[] } {
  const normalized = normalize(name);
  const exact = projects.find(p => normalize(p.name) === normalized) || null;
  const similar = projects.filter(p =>
    !exact && (
      normalize(p.name).includes(normalized) ||
      normalized.includes(normalize(p.name)) ||
      (p.aliases && p.aliases.some((a: string) => normalize(a) === normalized))
    )
  );
  return { exact, similar };
}

function findMatchingPerson(
  name: string,
  people: any[]
): { exact: any | null; similar: any[] } {
  const normalized = normalize(name);
  const exact = people.find(p => normalize(p.name) === normalized) || null;
  const similar = people.filter(p =>
    !exact && (
      normalize(p.name).includes(normalized) ||
      normalized.includes(normalize(p.name)) ||
      (p.aliases && p.aliases.some((a: string) => normalize(a) === normalized))
    )
  );
  return { exact, similar };
}

function getPersonProjects(person: any, allProjects: any[]): any[] {
  if (!person || !person.projects || person.projects.length === 0) return [];
  return allProjects.filter(p => person.projects.includes(p.id));
}

export function runCEORules(
  decision: Decision,
  registry: { projects?: any[]; people?: any[]; agents?: any[] }
): CEODecision {

  const projects = Array.isArray(registry.projects)
    ? registry.projects
    : [];

  const people = Array.isArray(registry.people)
    ? registry.people
    : [];

  const agents = Array.isArray(registry.agents)
    ? registry.agents
    : [];

  // --- Извлечение сущностей из решения (Gemini/парсер возвращает entities[]) ---
  const projectEntity =
    decision.entities?.find((e: any) => e.type === 'project') || null;
  const personEntity =
    decision.entities?.find((e: any) => e.type === 'person') || null;
  const projectName = projectEntity?.name || '';
  const personName = personEntity?.name || '';

  // --- Поиск проекта ---
  let projectResult = projectName ? findMatchingProject(projectName, projects) : null;
  let personResult = personName ? findMatchingPerson(personName, people) : null;

  // --- Случай 1: есть точный человек и точный проект ---
  if (personResult?.exact && projectResult?.exact) {
    const person = personResult.exact;
    const project = projectResult.exact;
    return {
      decision: 'USE_EXISTING_PROJECT',
      project_id: project.id,
      actions: [
        { type: 'set_project', project: project.folder || '12_Inbox' },
        { type: 'link_person', person_id: person.id }
      ],
      message: `✅ Использую проект "${project.name}" и человека "${person.name}".`
    };
  }

  // --- Случай 2: есть точный человек, но проект не указан или не найден ---
  if (personResult?.exact) {
    const person = personResult.exact;
    // Смотрим, с какими проектами связан этот человек
    const personProjects = getPersonProjects(person, projects);
    if (personProjects.length === 1) {
      // Ровно один проект — используем его
      const project = personProjects[0];
      return {
        decision: 'USE_EXISTING_PROJECT',
        project_id: project.id,
        actions: [
          { type: 'set_project', project: project.folder || '12_Inbox' },
          { type: 'link_person', person_id: person.id }
        ],
        message: `✅ Человек "${person.name}" связан с проектом "${project.name}". Использую его.`
      };
    } else if (personProjects.length > 1) {
      // Несколько проектов — спрашиваем, какой выбрать
      const buttons = personProjects.map(p => ({
        text: `📁 ${p.name}`,
        value: `project_existing_${p.id}`
      }));
      buttons.push({ text: '➕ Новый проект', value: 'project_create' });
      buttons.push({ text: '📥 В Inbox', value: 'project_inbox' });
      return {
        decision: 'ASK_USER',
        message: `👤 Человек "${person.name}" связан с несколькими проектами:\n${personProjects.map(p => `- ${p.name}`).join('\n')}\n\nВыберите проект для этой заметки:`,
        actions: [{ type: 'link_person', person_id: person.id }],
        buttons
      };
    } else {
      // Человек не связан ни с одним проектом — предлагаем выбрать или создать
      const buttons = [
        { text: '➕ Создать новый проект', value: 'project_create' },
        { text: '📥 В Inbox', value: 'project_inbox' }
      ];
      return {
        decision: 'ASK_USER',
        message: `👤 Человек "${person.name}" не связан ни с одним проектом. Создать новый или сохранить в Inbox?`,
        actions: [{ type: 'link_person', person_id: person.id }],
        buttons
      };
    }
  }

  // --- Случай 3: есть проект, но нет человека ---
  if (projectResult?.exact) {
    const project = projectResult.exact;
    if (personEntity && !personResult?.exact) {
      // Человек не найден — предлагаем создать или пропустить
      const buttons = [
        { text: '➕ Создать нового человека', value: 'person_create' },
        { text: '❌ Пропустить', value: 'person_skip' }
      ];
      return {
        decision: 'ASK_USER',
        message: `📁 Проект "${project.name}" найден, но человек "${personEntity.name}" не найден. Создать нового человека или пропустить?`,
        actions: [{ type: 'set_project', project: project.folder || '12_Inbox' }],
        buttons
      };
    } else {
      return {
        decision: 'USE_EXISTING_PROJECT',
        project_id: project.id,
        actions: [{ type: 'set_project', project: project.folder || '12_Inbox' }],
        message: `✅ Использую проект "${project.name}".`
      };
    }
  }

  // --- Случай 4: есть человек, но проект не указан и человек не связан ни с одним проектом ---
  if (personResult?.exact) {
    const person = personResult.exact;
    const buttons = [
      { text: '➕ Создать новый проект', value: 'project_create' },
      { text: '📥 В Inbox', value: 'project_inbox' }
    ];
    return {
      decision: 'ASK_USER',
      message: `👤 Человек "${person.name}" найден. Куда сохранить заметку?`,
      actions: [{ type: 'link_person', person_id: person.id }],
      buttons
    };
  }

  // --- Ничего не найдено — спрашиваем, что делать ---
  if (personName) {
    // Предлагаем создать человека или проект
    const buttons = [
      { text: '👤 Создать человека', value: 'person_create' },
      { text: '📁 Создать проект', value: 'project_create' },
      { text: '📥 В Inbox', value: 'project_inbox' }
    ];
    return {
      decision: 'ASK_USER',
      message: `👤 Человек "${personName}" не найден, проект не указан. Что делаем?`,
      actions: [],
      buttons
    };
  }

  // --- Совсем ничего нет — сохраняем в Inbox ---
  return {
    decision: 'USE_EXISTING_PROJECT',
    actions: [{ type: 'set_project', project: '12_Inbox' }],
    message: '📥 Сохраню в Inbox.'
  };
}
