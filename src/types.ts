// src/types.ts

export interface Entity {
  id?: string;
  type: string;
  name: string;
  aliases?: string[];
  [key: string]: any;
}

export interface Decision {
  entities: Entity[];
  title: string;
  folder?: string;
  type: string;
  summary: string;
  confidence: number;
  needConfirmation: boolean;
  note: string;
  tags?: string[];
  project?: string;
  people?: string;
}

export interface ConversationState {
  chatId: number;
  step:
    | "idle"
    | "waiting_ceo_answer"
    | "waiting_project_name"
    | "waiting_person_name";

  data: any;
}

export interface QuestionButton {
  id: string;
  text: string;
}

export interface CEOQuestion {
  type:
    | "confirmAlias"
    | "selectProject"
    | "confirmCreateProject"
    | "inputProjectName"
    | "inputPersonName";

  title: string;

  buttons?: QuestionButton[];
}

export interface CEODecision {
  decision:
    | "USE_EXISTING_PROJECT"
    | "CREATE_NEW_PROJECT"
    | "CREATE_NEW_ENTITY"
    | "UPDATE_REGISTRY"
    | "ASK_USER";

  message: string;

  question?: CEOQuestion;

  project_id?: string;

  new_entities?: Entity[];

  actions?: any[];

  buttons?: any[];
}

export interface CEOSession {
  decision: Decision;
  question?: CEOQuestion;
}
