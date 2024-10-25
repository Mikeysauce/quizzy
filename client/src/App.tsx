import { useEffect, useState, useRef } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { useWebSocket } from './hooks/useWebSocket';
import { assign, createMachine } from 'xstate';
import { useMachine } from '@xstate/react';
import { Flex, Text, Button, TextField } from '@radix-ui/themes';
import * as RadioGroup from '@radix-ui/react-radio-group';

import * as Form from '@radix-ui/react-form';

import '@radix-ui/themes/styles.css';

interface Client extends User {
  score: number;
}

interface User {
  id: string;
  isAdmin: boolean;
  name?: string;
}

const quizContext = {
  user: {
    id: '',
    isAdmin: false,
    name: '',
  },
  clients: [],
  ws: null,
  questions: [],
};

function Identify({ onSubmit }) {
  const [name, setName] = useState('');

  return (
    <div className="containzer">
      <h1>👋Quiz App</h1>
      <Form.Root className="FormRoot">
        <Form.Field className="FormField" name="name">
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <Form.Label className="FormLabel">Name</Form.Label>
            <Form.Message className="FormMessage" match="valueMissing">
              Please enter your name
            </Form.Message>
          </div>
          <Form.Control asChild>
            <input
              className="Input"
              type="text"
              required
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Control>
        </Form.Field>
        <Form.Submit asChild>
          <Button onClick={() => onSubmit(name)} style={{ marginTop: 10 }}>
            Submit
          </Button>
        </Form.Submit>
      </Form.Root>
    </div>
  );
}

function GameLobby({ clients, user, sendQuestionsToServer }) {
  const [questions, setQuestions] = useState(
    localStorage.getItem('questions')
      ? JSON.parse(localStorage.getItem('questions')!)
      : []
  );
  const [isSetup, setIsSetup] = useState(false);
  const lobby = new URLSearchParams(window.location.search).get('lobby');

  console.log(user);

  const isAdmin = user.isAdmin;
  const isPending = true;

  const adminName = clients.find((client) => client.isAdmin)?.name;

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const question = form[0].value;
    const answers = Array.from(form)
      .slice(1, 5)
      .map((input) => input.value);

    const correct = answers[form[5].value];

    setQuestions((questions) => [
      ...questions,
      {
        question,
        answers,
        correct,
        createdAt: new Date().toISOString(),
        isEditing: false,
      },
    ]);

    form.reset();
  };

  const handleEdit = (e: SubmitEvent, createdAt: string) => {
    e.preventDefault();
    const form = e.target;
    const question = form[0].value;
    const answers = Array.from(form)
      .slice(1, 5)
      .map((input) => input.value);

    const correct = answers[form[5].value];

    const questionToModify = questions.find(
      (question) => question.createdAt === createdAt
    );

    if (questionToModify) {
      questionToModify.question = question;
      questionToModify.answers = answers;
      questionToModify.correct = correct;
      questionToModify.isEditing = false;
      setQuestions([...questions]);
    }
  };

  const toggleEdit = (createdAt) => {
    const questionToModify = questions.find(
      (question) => question.createdAt === createdAt
    );

    if (questionToModify) {
      questionToModify.isEditing = !questionToModify.isEditing;
      setQuestions([...questions]);
    }
  };

  const saveQuestions = () => {
    localStorage.setItem('questions', JSON.stringify(questions));
  };

  if (isAdmin) {
    return (
      <div
        className="wrapper"
        style={{
          gridTemplateColumns: isSetup
            ? `minmax(200px, 1fr) minmax(200px, 1fr)`
            : '1fr',
        }}
      >
        <div>
          <div className="heading">
            <h2>
              Hello <span>{user.name}</span>, you are <span>hosting</span> lobby{' '}
              <span>{lobby}</span>{' '}
              {clients.length > 1 && (
                <>
                  with <span>{clients.length - 1}</span> other player(s).
                </>
              )}
            </h2>
          </div>
          <div className="questions">
            <Button onClick={() => setIsSetup(!isSetup)}>
              {isSetup ? 'Hide' : 'Show'} new question form
            </Button>
            {questions.length > 0 && (
              <>
                <p>
                  You currently have{' '}
                  <span style={{ fontWeight: 'bold' }}>{questions.length}</span>{' '}
                  question(s). When you have finished adding questions, press
                  the 'continue' button below to proceed.
                </p>
                <p>Click on a question to edit it.</p>
              </>
            )}
            <div className="questions-list-container">
              {questions.map((question, index) => (
                <div key={question.createdAt}>
                  <button
                    className="question-title-ghost-button"
                    onClick={() => toggleEdit(question.createdAt)}
                  >
                    {question.question} - {question.correct}
                  </button>
                  {question.isEditing && (
                    <form onSubmit={(e) => handleEdit(e, question.createdAt)}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <input type="text" defaultValue={question.question} />
                        {question.answers.map((answer, index) => (
                          <input
                            key={index}
                            type="text"
                            defaultValue={answer}
                          />
                        ))}
                        <input
                          type="text"
                          defaultValue={question.answers.indexOf(
                            question.correct
                          )}
                        />
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>

            {questions.length > 0 && (
              <div className="game-controls">
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 15,
                    alignItems: 'flex-start',
                  }}
                >
                  <Button onClick={saveQuestions}>
                    Save questions for later (localStorage)
                  </Button>
                  <Button
                    color="green"
                    onClick={() => sendQuestionsToServer(questions)}
                  >
                    Continue to game
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    localStorage.removeItem('questions');
                  }}
                  color="tomato"
                >
                  Clear localStorage questions
                </Button>
              </div>
            )}
          </div>
        </div>

        {isSetup && (
          <div>
            <h4>Add a question</h4>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input type="text" placeholder="Question" />
                <input type="text" placeholder="Answer 0" />
                <input type="text" placeholder="Answer 1" />
                <input type="text" placeholder="Answer 2" />
                <input type="text" placeholder="Answer 3" />
                <input
                  type="text"
                  placeholder="Correct Answer index e.g. 0, 1, 2, 3"
                />
                <Button type="submit">Add</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="heading">
        <h2>
          Hello <span>{user.name}</span>, you are in lobby <span>{lobby}</span>{' '}
          {clients.length > 1 && (
            <>
              with <span>{clients.length - 1}</span> other player(s).
            </>
          )}
        </h2>
        {isPending && (
          <p>
            Your host <span style={{ fontWeight: 'bold' }}>{adminName}</span> is
            currently setting up the questions.
          </p>
        )}
      </div>
      {/* <div>
        <h3>users</h3>
        <ul>
          {clients.map((client, index) => (
            <li key={index}>{client.name}</li>
          ))}
        </ul>
      </div> */}
    </div>
  );
}

function Game({ questions, sendAnswerToServer }) {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const currentQuestion = questions.find((question) => question.isActive);

  console.log(questions);

  if (!currentQuestion) {
    return <p>uhoh</p>;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const answer = form.querySelector('input[type="radio"]:checked').value;

    console.log('handleSubmit answer', answer);

    sendAnswerToServer(currentQuestion.createdAt, answer);
    setHasSubmitted(true);
  };
  return (
    <div>
      <div>
        <h2>{currentQuestion.question}</h2>

        <form onSubmit={handleSubmit}>
          <RadioGroup.Root
            className="RadioGroupRoot"
            defaultValue="default"
            aria-label="View density"
          >
            {currentQuestion.answers.map((answer, index) => (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <RadioGroup.Item
                  className="RadioGroupItem"
                  value={answer}
                  id={`r${index + 1}`}
                >
                  <RadioGroup.Indicator className="RadioGroupIndicator" />
                </RadioGroup.Item>
                <label className="Label" htmlFor={`r${index + 1}`}>
                  {answer}
                </label>
              </div>
            ))}
          </RadioGroup.Root>

          <div style={{ margin: '1rem 0' }}>
            <Button type="submit" disabled={hasSubmitted}>
              Submit
            </Button>
            {hasSubmitted && (
              <div>
                <p>
                  Your answer has been submitted, waiting for other players!
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const quizMachine = createMachine({
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
            questions: ({ context, event }) => event.questions,
          }),
          target: 'game',
        },
        UPDATE_CLIENTS: {
          actions: assign({
            clients: ({ context, event }) => event.clients,
            user: ({ context, event }) => {
              const updatedClients = event.clients;
              const user = updatedClients.find(
                (client) => client.name === context.user.name
              );

              console.log(updatedClients, context.user.name);

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
            questions: ({ context, event }) => {
              console.log('event questions', event.questions);
              console.log('context questions', context.questions);

              return event.questions;
            },
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

function App() {
  const [gameState, sendMachineCommand] = useMachine(quizMachine);
  const wsRef = useRef<WebSocket | null>(null);
  const lobby = new URLSearchParams(window.location.search).get('lobby');
  const port = process.env.WEBSOCKET_PORT ?? 3050;
  const websocketHost = process.env.WEBSOCKET_HOST ?? 'localhost';

  console.log('gameStateValue', gameState.value);

  useEffect(() => {
    console.log('useEffectahoy');
    if (gameState.matches('lobby') && !wsRef.current) {
      const ws = new WebSocket(`ws://${websocketHost}:${port}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('connected');
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
        console.log('this?');
        wsRef.current = null;
      };

      // return () => {
      //   console.log('unmounting why?');
      //   if (wsRef.current) {
      //     wsRef.current.close();
      //   }
      // };
    }
  }, [gameState, lobby, sendMachineCommand]);

  const shouldCenter = gameState.matches('enterName');

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

  console.log(gameState);

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

const GameResults = (props) => {
  console.log(props);

  // determine the overall winner. However, it is possible for multiple users to have the same score.
  const users = props.questions.reduce((acc, question) => {
    question.users.forEach((user) => {
      const existingUser = acc.find((u) => u.id === user.id);

      if (existingUser) {
        existingUser.score += user.score;
      } else {
        acc.push({ ...user });
      }
    });

    return acc;
  }, []);

  const winner = users.reduce(
    (acc, user) => {
      if (user.score > acc.score) {
        return user;
      }

      if (user.score === acc.score) {
        return {
          ...acc,
          name: `${acc.name}, ${user.name}`,
          isTie: true,
        };
      }

      return acc;
    },
    { id: '', name: '', score: 0 }
  );

  console.log(winner);
  return (
    <div>
      <div>
        <h1>Game over</h1>
        <h2>
          Winner {winner.name}{' '}
          {winner.isTie ? (
            <span>tied with {winner.score} points</span>
          ) : (
            <span>won with {winner.score}</span>
          )}
        </h2>
      </div>

      <div>
        {props.questions.map((question) => (
          <div>
            <h5>
              {question.question} ? <span>{question.correct}</span>
            </h5>
            <ul>
              {question.users.map((user) => (
                <li>
                  {user.name || 'Anonymous'} -{' '}
                  {user.score > 0 ? 'Correct' : 'Incorrect'}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

interface AnswerResultsProps {
  users: { id: string; name?: string; score: number }[];
  questions: {
    question: string;
    answers: string[];
    correct: string;
    createdAt: string;
  }[];
  currentQuestionId: string;
}

const AnswerResults: React.FC<AnswerResultsProps> = (props) => {
  const currentQuestion = props.questions.find((q) => q.isActive);

  console.log(currentQuestion);

  // if (!currentQuestion) {
  //   return <p>Question not found</p>;
  // }

  return (
    <div>
      <h2>Answer Results</h2>
      <p>Question: {currentQuestion.question}</p>
      <p>Correct Answer: {currentQuestion.correct}</p>
      <ul>
        {currentQuestion.users.map((user) => (
          <li key={user.id}>
            {user.name || 'Anonymous'} -{' '}
            {user.score > 0 ? 'Correct' : 'Incorrect'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
