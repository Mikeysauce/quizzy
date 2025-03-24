import { useEffect, useRef, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { quizMachine } from '../quizMachine';

export const useQuizMachine = () => {
  const [gameState, sendMachineCommand] = useMachine(quizMachine);
  const wsRef = useRef<WebSocket | null>(null);
  const lobby = new URLSearchParams(window.location.search).get('lobby');
  const websocketHost = import.meta.env.VITE_WEBSOCKET_HOST ?? 'localhost:3000';
  const websocketProtocol = websocketHost.includes('localhost') ? 'ws' : 'wss';

  // New client control functions
  const setReady = useCallback(
    (ready: boolean) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'setReady',
            userId: gameState.context.user.id,
            ready,
            lobby,
          })
        );
      }
    },
    [gameState.context.user.id, lobby]
  );

  // MOVE requestGameState before requestNextQuestion
  const requestGameState = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'requestGameState',
          userId: gameState.context.user.id,
          lobby,
        })
      );
    }
  }, [gameState.context.user.id, lobby]);

  const requestNextQuestion = useCallback(() => {
    console.log('Requesting next question...');

    if (
      wsRef.current?.readyState === WebSocket.OPEN &&
      gameState.context.user.isAdmin
    ) {
      try {
        // Get the questions array
        const questions = [...gameState.context.questions];

        // Find current active question index
        const activeIndex = questions.findIndex((q) => q.isActive);
        console.log('Current active question index:', activeIndex);

        // If no active question, try to recover
        if (activeIndex === -1) {
          console.log('No active question found, attempting recovery');

          // Simple approach: Make the first question active if none are
          if (questions.length > 0) {
            const updatedQuestions = [...questions];
            updatedQuestions[0].isActive = true;

            // Update local state
            sendMachineCommand({
              type: 'QUESTIONS',
              questions: updatedQuestions,
            });

            // Send to server
            wsRef.current.send(
              JSON.stringify({
                type: 'forceActivateQuestion',
                questionIndex: 0,
                userId: gameState.context.user.id,
                lobby,
              })
            );

            return true;
          }
          return false;
        }

        // Critical section: Update active question locally before telling server
        const nextIndex = activeIndex + 1;

        // Check if we've reached the end
        if (nextIndex >= questions.length) {
          console.log('No more questions - ending game');
          wsRef.current.send(
            JSON.stringify({
              type: 'gameEnd',
              userId: gameState.context.user.id,
              lobby,
            })
          );
          return true;
        }

        // Update locally first - deactivate current question, activate next one
        const updatedQuestions = [...questions];
        updatedQuestions.forEach((q, i) => {
          // Clear all active flags to prevent multiple active questions
          q.isActive = i === nextIndex;
        });

        // Update UI immediately with what we expect to happen
        sendMachineCommand({
          type: 'QUESTIONS',
          questions: updatedQuestions,
        });

        // Transition state machine to game state
        sendMachineCommand({ type: 'NEXT' });

        // THEN tell server to activate next question (in server's way)
        wsRef.current.send(
          JSON.stringify({
            type: 'nextQuestion',
            userId: gameState.context.user.id,
            lobby,
          })
        );

        // Request game state after a short delay to ensure sync with server
        setTimeout(() => {
          requestGameState();
        }, 300);

        return true;
      } catch (error) {
        console.error('Error in requestNextQuestion:', error);
        return false;
      }
    } else {
      console.error(
        'Cannot request next question: WebSocket not open or user not admin'
      );
      return false;
    }
  }, [gameState, sendMachineCommand, lobby, requestGameState]);

  // Add a new method for directly going to game state (emergency use)
  const forceGameState = useCallback(() => {
    console.log('EMERGENCY: Force transitioning to game state');
    sendMachineCommand({ type: 'NEXT' });

    // Also request fresh state from server
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'requestGameState',
          userId: gameState.context.user.id,
          lobby,
          emergency: true,
        })
      );
    }
  }, [gameState.context.user.id, lobby, sendMachineCommand]);

  // Add a new method to request game end
  const requestGameEnd = useCallback(() => {
    console.log('Requesting game end');

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'gameEnd',
          userId: gameState.context.user.id,
          lobby,
          timestamp: Date.now(),
        })
      );

      // Also update local state
      sendMachineCommand({ type: 'GAME_OVER' });

      return true;
    }

    return false;
  }, [gameState.context.user.id, lobby, sendMachineCommand]);

  // Add listener for game end requests
  useEffect(() => {
    const handleGameEndRequest = (event: Event) => {
      console.log('Game end requested - notifying server');

      // Notify server that game should end
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'gameEnd',
            userId: gameState.context.user.id,
            lobby,
            timestamp: Date.now(),
          })
        );
      }
    };

    window.addEventListener('quizzy:requestGameEnd', handleGameEndRequest);

    return () => {
      window.removeEventListener('quizzy:requestGameEnd', handleGameEndRequest);
    };
  }, [gameState.context.user.id, lobby]);

  // Existing gameOver handler
  useEffect(() => {
    const handleGameOver = () => {
      console.log('Game over event received, transitioning to gameOver state');
      sendMachineCommand({ type: 'GAME_OVER' });
    };

    window.addEventListener('quizzy:gameOver', handleGameOver);

    return () => {
      window.removeEventListener('quizzy:gameOver', handleGameOver);
    };
  }, [sendMachineCommand]);

  useEffect(() => {
    if (gameState.matches('lobby') && !wsRef.current) {
      const ws = new WebSocket(`${websocketProtocol}://${websocketHost}`);

      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'setName',
            name: gameState.context.user.name,
            lobby,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received:', data);

        // Handle different message types
        if (data.type === 'gameOver') {
          console.log('[WebSocket] Game over received - ending game');
          sendMachineCommand({ type: 'GAME_OVER' });
        }

        if (data.type === 'answerResults') {
          console.log('[WebSocket] Answer results received');
          sendMachineCommand({
            type: 'ANSWER_RESULTS',
            questionId: data.questionId,
            correctAnswer: data.correctAnswer,
            users: data.users,
          });
        }

        if (data.type === 'questions') {
          console.log('[WebSocket] Questions update received');

          // Verify we have an active question, if not, try to fix it
          const questions = data.questions;
          const activeQuestion = questions.find((q) => q.isActive);

          if (!activeQuestion && questions.length > 0) {
            console.log(
              '[WebSocket] No active question in server response, fixing locally'
            );

            // Find the last question that has answers
            const questionWithAnswers = [...questions]
              .reverse()
              .find((q) => q.users && q.users.length > 0);

            if (questionWithAnswers) {
              // If we found a question with answers, activate the next one
              const lastAnsweredIndex = questions.findIndex(
                (q) => q.createdAt === questionWithAnswers.createdAt
              );

              if (lastAnsweredIndex < questions.length - 1) {
                questions[lastAnsweredIndex + 1].isActive = true;
                console.log(
                  '[WebSocket] Activated question:',
                  questions[lastAnsweredIndex + 1].question
                );
              }
            } else {
              // If no questions have answers yet, activate the first one
              questions[0].isActive = true;
              console.log(
                '[WebSocket] Activated first question:',
                questions[0].question
              );
            }
          }

          // Now proceed with updating the state
          sendMachineCommand({
            type: 'QUESTIONS',
            questions: questions,
            lobby,
          });

          // If we're still in answerResults, force transition to game
          if (
            gameState.matches('answerResults') &&
            questions.find((q) => q.isActive)
          ) {
            console.log('[WebSocket] Forcing transition to game state');
            sendMachineCommand({ type: 'NEXT' });
          }
        }

        if (data.type === 'clients') {
          sendMachineCommand({
            type: 'UPDATE_CLIENTS',
            clients: data.clients,
          });
        }

        if (data.type === 'welcome') {
          sendMachineCommand({
            type: 'UPDATE_USER',
            user: {
              id: data.userId,
              isAdmin: data.isAdmin,
            },
          });
        }

        if (data.type === 'gameState') {
          sendMachineCommand({
            type: 'UPDATE_GAME_STATE',
            questions: data.questions,
            currentQuestion: data.currentQuestion,
          });
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    }

    // return () => {
    //   if (wsRef.current) {
    //     wsRef.current.close();
    //   }
    // };
  }, [gameState, sendMachineCommand, websocketHost, lobby]);

  const sendQuestionsToServer = (questions: any[]) => {
    wsRef.current?.send(
      JSON.stringify({ type: 'questions', questions, lobby })
    );
  };

  const sendAnswerToServer = (questionId: string, answer: string) => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'answer',
        userId: gameState.context.user.id,
        lobby,
        questionId,
        answer,
      })
    );
  };

  return {
    gameState,
    sendMachineCommand,
    sendQuestionsToServer,
    sendAnswerToServer,
    // Expose client control functions
    clientControls: {
      setReady,
      requestNextQuestion,
      requestGameState,
      forceGameState,
      requestGameEnd, // Add the new method
    },
  };
};
