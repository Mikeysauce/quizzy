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
  const queryparams = new URLSearchParams(window.location.search);
  const name = queryparams.get('name');

  if (name) {
    sendMachineCommand({ type: 'SUBMIT_NAME', name });
  }

  return (
    <div className={shouldCenter ? 'container' : ''}>
      {gameState.matches('identify') && !name && (
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
      {(gameState.matches('game') || gameState.matches('answerResults')) && (
        <Game
          questions={gameState.context.questions}
          sendAnswerToServer={sendAnswerToServer}
          isResults={gameState.matches('answerResults')}
        />
      )}

      {gameState.matches('gameOver') && <GameResults {...gameState.context} />}
    </div>
  );
}

export default App;
