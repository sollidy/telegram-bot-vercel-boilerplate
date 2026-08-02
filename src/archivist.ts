// src/archivist.ts
import { analyzeMessage } from './gemini';
import { runCEORules } from './ceoRules';
import { Decision, ConversationState, CEODecision } from './types';
import { getProjects, getPeople, getAgents, addPerson, addProject } from './registry';
import { createNote } from './notes';
import { normalizeText } from './alias';

export async function handleMessage(
  text: string,
  chatId: number,
  state: ConversationState
): Promise<any> {
  console.log(`[handleMessage] step=${state?.step || 'idle'}, text="${text}"`);

  const step = state.step || 'idle';
  const data = state.data || {};

  switch (step) {
    case 'idle': {
      console.log('[handleMessage] IDLE: normalizing text...');
      const normalizedText = await normalizeText(text);
      console.log('[handleMessage] IDLE: analyzing with Gemini...');
      const decision = await analyzeMessage(normalizedText);
      console.log('[handleMessage] IDLE: decision from Gemini:', JSON.stringify(decision, null, 2));

      console.log('[handleMessage] IDLE: loading registry...');
      const projects = await getProjects();
      const people = await getPeople();
      const agents = await getAgents();

      console.log('[handleMessage] IDLE: running CEO rules...');
      const ceoDecision: CEODecision = runCEORules(decision, { projects, people, agents });
      console.log('[handleMessage] IDLE: CEO decision:', JSON.stringify(ceoDecision, null, 2));

      if (ceoDecision.decision === 'ASK_USER') {
        console.log('[handleMessage] IDLE: ASK_USER, returning with buttons');
        return {
          type: 'ask',
          message: ceoDecision.message,
          buttons: ceoDecision.buttons || [],
          nextState: {
            step: 'waiting_ceo_answer',
            data: { decision, ceoDecision }
          }
        };
      }

      console.log('[handleMessage] IDLE: creating note...');
      const notePath = await createNote(decision, ceoDecision);
      console.log('[handleMessage] IDLE: note created at', notePath);

      return {
        type: 'confirm',
        decision,
        ceoDecision,
        message: ceoDecision.message,
        notePath,
        nextState: { step: 'idle', data: {} }
      };
    }

    case 'waiting_ceo_answer': {
      console.log('[handleMessage] WAITING_CEO_ANSWER: processing answer');
      const savedDecision = data.decision as Decision;
      const savedCEODecision = data.ceoDecision as CEODecision;
      if (!savedDecision) {
        console.log('[handleMessage] WAITING_CEO_ANSWER: no saved context');
        return {
          type: 'error',
          message: '❌ Потерян контекст. Начните сначала.',
          nextState: { step: 'idle', data: {} }
        };
      }

      let updatedDecision = savedDecision;
      let updatedCEODecision = savedCEODecision;
      let noteFolder = '12_Inbox';

      console.log('[handleMessage] WAITING_CEO_ANSWER: text=', text);

      try {
        if (text.startsWith('person_existing_')) {
          const personId = text.replace('person_existing_', '');
          console.log('[handleMessage] WAITING_CEO_ANSWER: person_existing_', personId);
          const people = await getPeople();
          const selectedPerson = people.find(p => p.id === personId);
          if (selectedPerson) {
            updatedCEODecision.actions = updatedCEODecision.actions || [];
            updatedCEODecision.actions.push({ type: 'link_person', person_id: selectedPerson.id });
            updatedCEODecision.message = `✅ Использую существующего человека: ${selectedPerson.name}`;
            noteFolder = updatedCEODecision.actions.find(a => a.type === 'set_project')?.project || '12_Inbox';
            updatedCEODecision.actions.push({ type: 'create_note', folder: noteFolder });
          } else {
            console.log('[handleMessage] WAITING_CEO_ANSWER: person not found');
          }
        } else if (text === 'person_create') {
          console.log('[handleMessage] WAITING_CEO_ANSWER: person_create');
          const newPerson = {
            id: `person-${Date.now()}`,
            name: 'Новый человек',
            aliases: [],
            projects: []
          };
          await addPerson(newPerson);
          console.log('[handleMessage] WAITING_CEO_ANSWER: person created');
          updatedCEODecision.actions = updatedCEODecision.actions || [];
          updatedCEODecision.actions.push({ type: 'link_person', person_id: newPerson.id });
          updatedCEODecision.message = `✅ Создан новый человек: ${newPerson.name}`;
          noteFolder = updatedCEODecision.actions.find(a => a.type === 'set_project')?.project || '12_Inbox';
          updatedCEODecision.actions.push({ type: 'create_note', folder: noteFolder });
        } else if (text === 'person_skip') {
          console.log('[handleMessage] WAITING_CEO_ANSWER: person_skip');
          updatedCEODecision.actions = updatedCEODecision.actions || [];
          noteFolder = updatedCEODecision.actions.find(a => a.type === 'set_project')?.project || '12_Inbox';
          updatedCEODecision.actions.push({ type: 'create_note', folder: noteFolder });
          updatedCEODecision.message = `✅ Сохраню без привязки человека.`;
        } else if (text.startsWith('project_existing_')) {
          const projectId = text.replace('project_existing_', '');
          console.log('[handleMessage] WAITING_CEO_ANSWER: project_existing_', projectId);
          const projects = await getProjects();
          const selectedProject = projects.find(p => p.id === projectId);
          if (selectedProject) {
            updatedCEODecision.actions = updatedCEODecision.actions || [];
            updatedCEODecision.actions.push({ type: 'set_project', project: selectedProject.folder || '12_Inbox' });
            updatedCEODecision.message = `✅ Использую существующий проект: ${selectedProject.name}`;
            noteFolder = selectedProject.folder || '12_Inbox';
            updatedCEODecision.actions.push({ type: 'create_note', folder: noteFolder });
          } else {
            console.log('[handleMessage] WAITING_CEO_ANSWER: project not found');
          }
        } else if (text === 'project_create') {
          console.log('[handleMessage] WAITING_CEO_ANSWER: project_create');
          const newProject = {
            id: `project-${Date.now()}`,
            name: 'Новый проект',
            status: 'активен',
            folder: '12_Inbox',
            created: new Date().toISOString().slice(0, 10),
            tags: []
          };
          await addProject(newProject);
          console.log('[handleMessage] WAITING_CEO_ANSWER: project created');
          updatedCEODecision.actions = updatedCEODecision.actions || [];
          updatedCEODecision.actions.push({ type: 'set_project', project: '12_Inbox' });
          updatedCEODecision.message = `✅ Создан новый проект: ${newProject.name}`;
          noteFolder = '12_Inbox';
          updatedCEODecision.actions.push({ type: 'create_note', folder: noteFolder });
        } else if (text === 'project_inbox') {
          console.log('[handleMessage] WAITING_CEO_ANSWER: project_inbox');
          noteFolder = '12_Inbox';
          updatedCEODecision.actions = updatedCEODecision.actions || [];
          updatedCEODecision.actions.push({ type: 'set_project', project: '12_Inbox' });
          updatedCEODecision.actions.push({ type: 'create_note', folder: noteFolder });
          updatedCEODecision.message = `📥 Сохраню в Inbox.`;
        } else if (text === 'cancel') {
          console.log('[handleMessage] WAITING_CEO_ANSWER: cancel');
          return {
            type: 'response',
            message: '❌ Отменено.',
            nextState: { step: 'idle', data: {} }
          };
        } else {
          console.log('[handleMessage] WAITING_CEO_ANSWER: unknown answer, asking again');
          return {
            type: 'ask',
            message: '❌ Не понял ответ. Пожалуйста, выберите из предложенных вариантов.',
            buttons: savedCEODecision.buttons || [],
            nextState: { step: 'waiting_ceo_answer', data: { decision: savedDecision, ceoDecision: savedCEODecision } }
          };
        }
      } catch (error) {
        console.error('[handleMessage] WAITING_CEO_ANSWER: error processing answer', error);
        return {
          type: 'error',
          message: `❌ Ошибка: ${(error instanceof Error ? error.message : String(error))}`,
          nextState: { step: 'idle', data: {} }
        };
      }

      console.log('[handleMessage] WAITING_CEO_ANSWER: creating note...');
      try {
        const notePath = await createNote(updatedDecision, updatedCEODecision);
        console.log('[handleMessage] WAITING_CEO_ANSWER: note created at', notePath);
        return {
          type: 'confirm',
          decision: updatedDecision,
          ceoDecision: updatedCEODecision,
          message: updatedCEODecision.message,
          notePath,
          nextState: { step: 'idle', data: {} }
        };
      } catch (error) {
        console.error('[handleMessage] WAITING_CEO_ANSWER: error creating note', error);
        return {
          type: 'error',
          message: `❌ Ошибка создания заметки: ${(error instanceof Error ? error.message : String(error))}`,
          nextState: { step: 'idle', data: {} }
        };
      }
    }

    default: {
      console.log('[handleMessage] default: unknown state');
      return {
        type: 'error',
        message: '❌ Неизвестное состояние. Начните сначала.',
        nextState: { step: 'idle', data: {} }
      };
    }
  }
}
