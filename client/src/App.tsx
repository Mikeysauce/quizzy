import './App.css';
import '@radix-ui/themes/styles.css';
import Identify from './components/Identify';
import GameLobby from './components/GameLobby';
import { useQuizMachine } from './hooks/useQuizMachine';
import { AnswerResults } from './components/AnswerResults';
import { GameResults } from './components/GameResults';
import Game from './components/Game';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from './hooks/useWindowSize';
import { Toaster } from 'react-hot-toast';
import ReadyControls from './components/ReadyControls';

function App() {
  const {
    gameState,
    sendMachineCommand,
    sendAnswerToServer,
    sendQuestionsToServer,
    clientControls,
  } = useQuizMachine();
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const shouldCenter = gameState.matches('identify');
  const queryparams = new URLSearchParams(window.location.search);
  const name = queryparams.get('name');

  // Add special effect for answerResults state to force transition after timeout
  useEffect(() => {
    console.log('Current game state:', gameState.value);

    // Show confetti when game ends
    if (gameState.matches('gameOver')) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [gameState, clientControls]);

  if (name) {
    sendMachineCommand({ type: 'SUBMIT_NAME', name });
  }

  const questions = useMemo(() => gameState.context.questions, [gameState]);

  // Add a function to directly advance questions
  const advanceToNextQuestion = useCallback(() => {
    console.log('App: Advancing to next question');

    // Get current active question index
    const activeIndex = questions.findIndex((q) => q.isActive);
    console.log('Current active question index:', activeIndex);

    // If no active question or at the end, handle appropriately
    if (activeIndex === -1) {
      if (questions.length > 0) {
        // Activate the first question
        const updatedQuestions = questions.map((q, i) => ({
          ...q,
          isActive: i === 0,
        }));

        sendMachineCommand({
          type: 'QUESTIONS',
          questions: updatedQuestions,
        });
      }
      return;
    }

    // Check if there's a next question
    if (activeIndex < questions.length - 1) {
      // Prepare a clean array with next question active
      const updatedQuestions = questions.map((q, i) => ({
        ...q,
        isActive: i === activeIndex + 1,
      }));

      // First set the UI state
      sendMachineCommand({
        type: 'QUESTIONS',
        questions: updatedQuestions,
      });

      // Then ensure we're in game state
      if (gameState.matches('answerResults')) {
        sendMachineCommand({ type: 'NEXT' });
      }

      // Finally tell server
      clientControls.requestNextQuestion();
    } else {
      // At the end, go to game over state
      clientControls.requestGameEnd();
    }
  }, [questions, gameState, sendMachineCommand, clientControls]);

  console.log('app re-render');

  return (
    <div className={shouldCenter ? 'container' : ''}>
      <Toaster position="top-right" />

      {showConfetti && (
        <Confetti width={width} height={height} recycle={false} />
      )}

      <AnimatePresence mode="wait">
        {gameState.matches('identify') && !name && (
          <motion.div
            key="identify"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Identify
              onSubmit={(name) =>
                sendMachineCommand({ type: 'SUBMIT_NAME', name })
              }
            />
          </motion.div>
        )}

        {gameState.matches('lobby') && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GameLobby
              clients={gameState.context.clients}
              user={gameState.context.user}
              sendQuestionsToServer={sendQuestionsToServer}
            />
          </motion.div>
        )}

        {(gameState.matches('game') || gameState.matches('answerResults')) && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Game
              questions={questions}
              sendAnswerToServer={sendAnswerToServer}
              isResults={gameState.matches('answerResults')}
              forceNextQuestion={() => {
                console.log('Game component requesting force transition');
                advanceToNextQuestion();
              }}
              isAdmin={gameState?.context?.user?.isAdmin}
            />
          </motion.div>
        )}

        {/* Remove ReadyControls - we're auto-transitioning now */}
        {/* {gameState.matches('answerResults') && (
          <ReadyControls
            isAdmin={gameState.context.user.isAdmin}
            isReady={
              gameState.context.clients.find(
                (c) => c.id === gameState.context.user.id
              )?.ready || false
            }
            onSetReady={clientControls.setReady}
            onNextQuestion={clientControls.requestNextQuestion}
            allClientsReady={
              gameState.context.clients.length > 0 &&
              gameState.context.clients.every((client) => client.ready)
            }
          />
        )} */}

        {gameState.matches('gameOver') && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <GameResults {...gameState.context} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
