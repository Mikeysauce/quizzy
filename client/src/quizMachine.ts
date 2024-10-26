import { assign, createMachine } from 'xstate';
import { QuizContext, QuizEvent } from './types/quizMachine';

const quizContext: QuizContext = {
  user: {
    id: '',
    isAdmin: false,
    name: '',
  },
  clients: [],
  ws: null,
  questions: [],
};

export const quizMachine = createMachine({
  types: {} as {
    context: QuizContext;
    events: QuizEvent;
  },
  id: 'quiz',
  initial: 'identify',
  context: quizContext,
  states: {
    identify: {
      on: {
        SUBMIT_NAME: {
          target: 'lobby',
          actions: assign({
            user: ({ context, event }) => ({
              ...context.user,
              name: event.name,
            }),
          }),
        },
      },
    },
    lobby: {
      on: {
        JOIN: 'game',
        QUESTIONS: {
          actions: assign({
            questions: ({ event }) => event.questions,
          }),
          target: 'game',
        },
        UPDATE_CLIENTS: {
          actions: assign({
            clients: ({ event }) => event.clients,
            user: ({ context, event }) => {
              const updatedClients = event.clients;
              const user = updatedClients.find(
                (client) => client.name === context.user.name
              );

              return user ?? context.user;
            },
          }),
        },
      },
    },
    game: {
      on: {
        START: 'question',
        ANSWER_RESULTS: {
          actions: assign({
            questions: ({ context, event }) => {
              const updatedQuestions = context.questions.map((question) => {
                if (question.createdAt === event.questionId) {
                  return {
                    ...question,
                    users: event.users,
                  };
                }

                return question;
              });

              return updatedQuestions;
            },
          }),
          target: 'answerResults',
        },
      },
    },
    answerResults: {
      on: {
        GAME_OVER: 'gameOver',
        QUESTIONS: {
          target: 'game',
          actions: assign({
            questions: ({ event }) => event.questions,
          }),
        },
        NEXT: 'question',
        END: 'results',
      },
    },
    gameOver: {
      on: {
        RESTART: 'identify',
      },
    },
    question: {
      on: {
        NEXT: 'question',
        END: 'results',
      },
    },
    results: {
      on: {
        RESTART: 'identify',
      },
    },
  },
});
