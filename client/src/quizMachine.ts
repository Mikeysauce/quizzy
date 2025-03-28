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
        // Add transition back to identify state on username error
        USERNAME_ERROR: {
          target: 'identify',
          actions: assign({
            user: ({ context }) => ({
              ...context.user,
              name: '', // Clear the name
            }),
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
              console.log('Processing ANSWER_RESULTS in game state', event);
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
        QUESTIONS: {
          actions: assign({
            questions: ({ event }) => {
              console.log('Processing QUESTIONS in game state', event);
              return event.questions;
            },
          }),
        },
      },
    },
    answerResults: {
      on: {
        GAME_OVER: 'gameOver',
        QUESTIONS: {
          target: 'game',
          actions: assign({
            questions: ({ event }) => {
              console.log(
                '[State Machine] Processing QUESTIONS in answerResults state',
                event
              );

              // Find the active question and log it
              const activeQuestion = event.questions.find((q) => q.isActive);
              if (activeQuestion) {
                console.log(
                  '[State Machine] Found active question, transitioning to game',
                  activeQuestion.question
                );
              } else {
                console.warn(
                  '[State Machine] No active question found in QUESTIONS event'
                );
              }

              return event.questions;
            },
          }),
        },
        NEXT: {
          // Explicitly transition to game state
          target: 'game',
          actions: ({ context }) => {
            console.log(
              '[State Machine] Processing NEXT event in answerResults state'
            );
            console.log('[State Machine] Forcing transition to game state');

            // Find active question for debugging
            const activeQuestion = context.questions.find((q) => q.isActive);
            console.log(
              '[State Machine] Active question during transition:',
              activeQuestion ? activeQuestion.question : 'None'
            );
          },
        },
        // Add a direct transition for emergency situations
        DIRECT_TO_GAME: {
          target: 'game',
          actions: [
            () =>
              console.log(
                '[State Machine] EMERGENCY direct transition to game state'
              ),
            assign({
              questions: ({ context, event }) => {
                // If the event includes questions, use them, otherwise keep current
                return event.questions || context.questions;
              },
            }),
          ],
        },
        END: 'results',
      },
      // Automatic transition after showing results
      after: {
        // After 5 seconds in answerResults, automatically transition back to game
        5000: {
          target: 'game',
          actions: () =>
            console.log(
              '[State Machine] AUTOMATIC timeout transition to game after 5s'
            ),
        },
      },
    },
    gameOver: {
      on: {
        // REMOVE the direct RESTART to identify transition and replace with proper handling
        // RESTART: 'identify', <- This is causing our problem by going back to identity screen

        // Instead, handle RESTART by going to lobby while preserving identity
        RESTART: {
          target: 'lobby',
          actions: [
            () =>
              console.log(
                '[State Machine] Manual restart requested - going to lobby with preserved identity'
              ),
            assign({
              questions: () => [], // Clear questions
              // Explicitly keep user identity
            }),
          ],
        },

        // Keep our existing NEXT and GAME_RESTART handlers
        NEXT: {
          target: 'game',
          actions: () =>
            console.log(
              '[State Machine] Attempting to continue from gameOver state'
            ),
        },

        // Enhance our GAME_RESTART handler to be more explicit
        GAME_RESTART: {
          target: 'lobby',
          actions: [
            () =>
              console.log(
                '[State Machine] Server initiated restart - preserving user identity'
              ),
            assign({
              questions: () => [], // Clear questions
              // User info is implicitly preserved
            }),
          ],
        },
      },
    },
    question: {
      on: {
        // Modify to ensure NEXT works properly
        NEXT: {
          target: 'game', // Go to game state instead of looping in question
          actions: () =>
            console.log(
              '[State Machine] Moving to next question via game state'
            ),
        },
        END: 'results',
      },
    },
    results: {
      on: {
        RESTART: 'identify',
      },
    },
  },
  on: {
    UPDATE_USER: {
      actions: assign({
        user: ({ context, event }) => ({
          ...context.user,
          ...event.user,
        }),
      }),
    },
    UPDATE_CLIENTS: {
      actions: assign({
        clients: ({ event }) => event.clients,
      }),
    },
  },
});
