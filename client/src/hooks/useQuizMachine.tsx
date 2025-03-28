import { useEffect, useRef, useCallback, useState } from 'react';
import { useMachine } from '@xstate/react';
import { quizMachine } from '../quizMachine';
import toast from 'react-hot-toast';

export const useQuizMachine = () => {
  const [gameState, sendMachineCommand] = useMachine(quizMachine);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const lobby =
    new URLSearchParams(window.location.search).get('lobby') ?? 'default-lobby';
  const websocketHost = import.meta.env.VITE_WEBSOCKET_HOST ?? 'localhost:3000';
  const websocketProtocol = websocketHost.includes('localhost') ? 'ws' : 'wss';
  const [error, setError] = useState<string | null>(null);
  const pendingNameRef = useRef<string | null>(null);

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

  // Add a new direct game end event listener
  useEffect(() => {
    const handleForceGameEnd = (event: any) => {
      console.log(
        'DIRECT force game end requested with details:',
        event.detail
      );

      // First update local state
      sendMachineCommand({ type: 'GAME_OVER' });

      // Then ensure server knows about it - with a special flag to indicate it's final
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'forceGameEnd', // New more explicit message type
            userId: gameState.context.user.id,
            lobby,
            timestamp: Date.now(),
            // Add the special flag to indicate this is the final game end request
            final: true,
          })
        );
      }
    };

    window.addEventListener('quizzy:forceGameEnd', handleForceGameEnd);

    return () => {
      window.removeEventListener('quizzy:forceGameEnd', handleForceGameEnd);
    };
  }, [gameState.context.user.id, lobby, sendMachineCommand]);

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

  // Simplified submitName function
  const submitName = useCallback(
    (name: string) => {
      // Store the name we're trying to submit
      pendingNameRef.current = name;

      // If we already have a websocket connection, just send the name
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'setName',
            name,
            lobby,
          })
        );
        return;
      }

      // Otherwise we need to create a connection first
      setIsConnecting(true);
      setError(null);

      const ws = new WebSocket(`${websocketProtocol}://${websocketHost}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'setName',
            name,
            lobby,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Initial response:', data);

        if (data.type === 'error') {
          console.error('[WebSocket] Error:', data.message);
          setError(data.message);
          pendingNameRef.current = null;
          setIsConnecting(false);

          if (data.error === 'username_taken') {
            toast.error(data.message || 'Username already taken', {
              duration: 5000,
              icon: '⚠️',
            });
            sendMachineCommand({ type: 'USERNAME_ERROR' });
          }
          return;
        }

        // Handle direct nameConfirmed response
        if (data.type === 'nameConfirmed' && pendingNameRef.current) {
          // Update the user info with admin status
          sendMachineCommand({
            type: 'SUBMIT_NAME',
            name: pendingNameRef.current,
          });

          // Also update the user with admin status if present
          if (data.isAdmin !== undefined) {
            sendMachineCommand({
              type: 'UPDATE_USER',
              user: {
                id: data.userId,
                isAdmin: data.isAdmin,
                name: data.name,
              },
            });
          }

          setupMessageHandlers(ws);
          setIsConnecting(false);
          pendingNameRef.current = null;
          return;
        }

        // For other message types, set up the regular message handlers
        setupMessageHandlers(ws);

        // Only if we didn't get an error, update the name and proceed to lobby
        if (pendingNameRef.current) {
          sendMachineCommand({
            type: 'SUBMIT_NAME',
            name: pendingNameRef.current,
          });
          setIsConnecting(false);
          pendingNameRef.current = null;
        }
      };

      ws.onerror = () => {
        toast.error('Failed to connect to server', { duration: 5000 });
        setError('Connection failed. Please try again.');
        setIsConnecting(false);
        pendingNameRef.current = null;
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (pendingNameRef.current) {
          setError('Connection closed. Please try again.');
          setIsConnecting(false);
          pendingNameRef.current = null;
        }
      };
    },
    [websocketProtocol, websocketHost, lobby, sendMachineCommand]
  );

  // Simplified message handlers
  const setupMessageHandlers = useCallback(
    (ws: WebSocket) => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received:', data);

        // Handle error messages
        if (data.type === 'error') {
          console.error('[WebSocket] Error:', data.message);
          setError(data.message);

          if (data.error === 'username_taken') {
            toast.error(data.message || 'Username already taken', {
              duration: 5000,
              icon: '⚠️',
            });
          }
          return;
        }

        // Handle welcome or updateUser message with admin information
        if (data.type === 'welcome' || data.type === 'updateUser') {
          console.log(
            `[WebSocket] Received ${data.type} with admin status:`,
            data.isAdmin
          );

          // Make sure we have the correct user ID and it matches our context
          if (
            data.id === gameState.context.user.id ||
            data.userId === gameState.context.user.id
          ) {
            sendMachineCommand({
              type: 'UPDATE_USER',
              user: {
                id: data.userId || data.id,
                isAdmin: data.isAdmin,
                ...(data.name && { name: data.name }),
              },
            });

            console.log(`[WebSocket] Updated user status:`, {
              id: data.userId || data.id,
              isAdmin: data.isAdmin,
              name: data.name,
            });
          }
        }

        // Handle clients update - properly update local state
        if (data.type === 'clients') {
          console.log('[WebSocket] Clients update received:', data.clients);

          // Update the context with the new client list
          sendMachineCommand({
            type: 'UPDATE_CLIENTS',
            clients: data.clients,
          });

          // If the current user is in the client list, update their state
          const currentUser = data.clients.find(
            (client) => client.name === gameState.context.user.name
          );

          if (currentUser) {
            sendMachineCommand({
              type: 'UPDATE_USER',
              user: {
                id: currentUser.id,
                isAdmin: currentUser.isAdmin,
                name: currentUser.name,
              },
            });
          }
        }

        // Handle different message types
        if (data.type === 'gameOver') {
          console.log(
            '[WebSocket] Game over received - FORCE ending game for all players'
          );

          // More aggressive approach - transition immediately
          sendMachineCommand({ type: 'GAME_OVER' });

          // Show a clear UI indication
          toast.success('Game has ended! Viewing final results...', {
            icon: '🏆',
            duration: 5000,
          });

          // // Add a delay then force a reload if still not in game over state
          // setTimeout(() => {
          //   if (!gameState.matches('gameOver')) {
          //     console.log(
          //       'Still not in gameOver state after delay - forcing hard reload'
          //     );
          //     window.location.reload();
          //   }
          // }, 3000);
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

        // Handle restart status updates
        if (data.type === 'restartStatus') {
          // Show a toast with the restart status
          toast.info(
            `${data.requestCount} of ${
              data.userCount
            } players ready to restart (${Math.round(data.percentage)}%)`,
            { duration: 3000, id: 'restart-status' }
          );
        }

        // Handle game restart
        if (data.type === 'gameRestart') {
          console.log('[WebSocket] Received game restart command');

          // Make sure we use the correct state transition type
          sendMachineCommand({
            type: 'GAME_RESTART',
          });

          // Wait a moment to ensure the state transition completes
          setTimeout(() => {
            // Verify transition was successful
            if (gameState.matches('lobby')) {
              toast.success('Game restarted! You are back in the lobby', {
                duration: 3000,
              });
            } else {
              console.warn(
                'Failed to transition to lobby, current state:',
                gameState.value
              );
              // Force the transition if needed
              sendMachineCommand({
                type: 'GAME_RESTART',
              });
            }
          }, 100);
        }
      };
    },
    [sendMachineCommand, gameState.context.user.id, gameState.context.user.name]
  );

  useEffect(() => {
    // We've moved the connection initialization to the submitName function
    // This effect now only needs to handle existing connections
    if (gameState.matches('lobby') && wsRef.current) {
      setupMessageHandlers(wsRef.current);
    }
  }, [gameState, setupMessageHandlers]);

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
    submitName, // Export the new submitName function instead of using sendMachineCommand directly
    sendQuestionsToServer,
    sendAnswerToServer,
    error,
    isConnecting, // Expose loading state
    wsRef, // Export the WebSocket reference
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
