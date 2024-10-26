import './App.css';
import '@radix-ui/themes/styles.css';
import Identify from './components/Identify';
import GameLobby from './components/GameLobby';
import { useQuizMachine } from './hooks/useQuizMachine';
import { AnswerResults } from './components/AnswerResults';
import { GameResults } from './components/GameResults';
import Game from './components/Game';

function App() {
  const {
    gameState,
    sendMachineCommand,
    sendAnswerToServer,
    sendQuestionsToServer,
  } = useQuizMachine();

  const shouldCenter = gameState.matches('identify');

  return (
    <div className={shouldCenter ? 'container' : ''}>
      {gameState.matches('identify') && (
        <Identify
          onSubmit={(name) => sendMachineCommand({ type: 'SUBMIT_NAME', name })}
        />
      )}
      {gameState.matches('lobby') && (
        <GameLobby
          clients={gameState.context.clients}
          user={gameState.context.user}
          sendQuestionsToServer={sendQuestionsToServer}
        />
      )}
      {gameState.matches('game') && (
        <Game
          questions={gameState.context.questions}
          sendAnswerToServer={sendAnswerToServer}
        />
      )}
      {gameState.matches('answerResults') && (
        <AnswerResults {...gameState.context} />
      )}

      {gameState.matches('gameOver') && <GameResults {...gameState.context} />}
    </div>
  );
}

export default App;
