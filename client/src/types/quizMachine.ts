export interface EventObject {
  type: string;
}

export interface User {
  id: string;
  isAdmin: boolean;
  name: string;
}

export interface Client {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface Question {
  question: string;
  answers: string[];
  correct: string;
  createdAt: string;
  isEditing: boolean;
}

export interface QuizContext {
  user: User;
  clients: Client[];
  ws: WebSocket | null;
  questions: Question[];
}

export interface SubmitNameEvent extends EventObject {
  type: 'SUBMIT_NAME';
  name: string;
}

export interface JoinEvent extends EventObject {
  type: 'JOIN';
}

export interface QuestionsEvent extends EventObject {
  type: 'QUESTIONS';
  questions: Question[];
}

export interface UpdateClientsEvent extends EventObject {
  type: 'UPDATE_CLIENTS';
  clients: Client[];
}

export interface StartEvent extends EventObject {
  type: 'START';
}

export interface AnswerResultsEvent extends EventObject {
  type: 'ANSWER_RESULTS';
  questionId: string;
  users: any[]; // Define the appropriate type for users
}

export interface GameOverEvent extends EventObject {
  type: 'GAME_OVER';
}

export interface RestartEvent extends EventObject {
  type: 'RESTART';
}

export interface NextEvent extends EventObject {
  type: 'NEXT';
}

export interface EndEvent extends EventObject {
  type: 'END';
}

export interface UsernameErrorEvent extends EventObject {
  type: 'USERNAME_ERROR';
}

export type QuizEvent =
  | SubmitNameEvent
  | JoinEvent
  | QuestionsEvent
  | UpdateClientsEvent
  | StartEvent
  | AnswerResultsEvent
  | GameOverEvent
  | RestartEvent
  | NextEvent
  | EndEvent
  | UsernameErrorEvent;
