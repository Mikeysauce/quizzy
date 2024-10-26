import { useEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { createMachine } from 'xstate';
import { quizMachine } from '../quizMachine';

export const useQuizMachine = () => {
  const [gameState, sendMachineCommand] = useMachine(quizMachine);
  const wsRef = useRef<WebSocket | null>(null);
  const lobby = new URLSearchParams(window.location.search).get('lobby');
  const websocketHost = import.meta.env.VITE_WEBSOCKET_HOST ?? 'localhost:3000';
  const websocketProtocol = websocketHost.includes('localhost') ? 'ws' : 'wss';
  console.log('nodeenv', import.meta.env.VITE_NODE_ENV);

  useEffect(() => {
    if (gameState.matches('lobby') && !wsRef.current) {
      console.log('connecting to websocket');
      const ws = new WebSocket(`${websocketProtocol}://${websocketHost}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('connected to websocket');
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
        console.log('data', data);

        if (data.type === 'gameOver') {
          sendMachineCommand({
            type: 'GAME_OVER',
          });
        }

        if (data.type === 'answerResults') {
          sendMachineCommand({
            type: 'ANSWER_RESULTS',
            questionId: data.questionId,
            correctAnswer: data.correctAnswer,
            users: data.users,
          });
        }

        if (data.type === 'questions') {
          sendMachineCommand({
            type: 'QUESTIONS',
            questions: data.questions,
            lobby,
          });
        }

        if (data.type === 'clients') {
          sendMachineCommand({ type: 'UPDATE_CLIENTS', clients: data.clients });
        }

        if (data.type === 'welcome') {
          console.log('welcome', data);
          sendMachineCommand({
            type: 'UPDATE_USER',
            user: {
              id: data.userId,
              isAdmin: data.isAdmin,
            },
          });
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    }

    // return () => {
    //   if (wsRef.current) {
    //     console.log('closing websocket');
    //     wsRef.current.close();
    //   }
    // };
  }, [gameState, sendMachineCommand, websocketHost, lobby]);

  const sendQuestionsToServer = (questions: any[]) => {
    console.log('sendQuestionsToServer', questions);
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

  console.log(gameState.value);

  return {
    gameState,
    sendMachineCommand,
    sendQuestionsToServer,
    sendAnswerToServer,
  };
};
