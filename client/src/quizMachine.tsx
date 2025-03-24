import { createMachine, assign } from 'xstate';

// Add the missing state handlers for our new client controls
export const quizMachine = createMachine({
  // ...existing code...

  context: {
    // ...existing context...
    clients: [],
    // Add new context properties
    allReady: false,
    activeQuestionId: null,
  },

  states: {
    // ...existing states...
  },

  on: {
    // ...existing events...

    UPDATE_CLIENTS: {
      actions: assign({
        clients: (_, event) => event.clients,
        allReady: (_, event) =>
          event.clients.length > 0 &&
          event.clients.every((client) => client.ready),
      }),
    },

    UPDATE_GAME_STATE: {
      actions: assign({
        questions: (_, event) => event.questions,
        currentQuestion: (_, event) =>
          event.currentQuestion >= 0
            ? event.questions[event.currentQuestion]
            : null,
        activeQuestionId: (_, event) =>
          event.currentQuestion >= 0
            ? event.questions[event.currentQuestion]?.createdAt
            : null,
      }),
    },

    QUESTIONS: {
      actions: assign({
        questions: (_, event) => {
          const activeQuestionIndex = event.questions.findIndex(
            (q) => q.isActive
          );
          return event.questions;
        },
        currentQuestion: (_, event) => {
          const activeQuestion = event.questions.find((q) => q.isActive);
          return activeQuestion || null;
        },
        activeQuestionId: (_, event) => {
          const activeQuestion = event.questions.find((q) => q.isActive);
          return activeQuestion?.createdAt || null;
        },
      }),
    },
  },
});
