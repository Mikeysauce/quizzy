import {
  Box,
  Button,
  Callout,
  Container,
  Flex,
  Spinner,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import QuestionForm from './QuestionForm';
import { useState } from 'react';

interface GameLobbyProps {
  clients: { name: string; isAdmin: boolean }[];
  user: { name: string; isAdmin: boolean };
  sendQuestionsToServer: (questions: any) => void;
}

function GameLobby({ clients, user, sendQuestionsToServer }: GameLobbyProps) {
  const questionsUrlParam = new URLSearchParams(window.location.search).get(
    'questions'
  );
  const questionsFromUrl = questionsUrlParam
    ? JSON.parse(decodeURIComponent(questionsUrlParam))
    : [];

  const [questions, setQuestions] = useState(
    questionsFromUrl.length > 0
      ? questionsFromUrl
      : localStorage.getItem('questions')
      ? JSON.parse(localStorage.getItem('questions')!)
      : []
  );
  const [isSetup, setIsSetup] = useState(false);
  const lobby = new URLSearchParams(window.location.search).get('lobby');

  const isAdmin = user.isAdmin;
  const isPending = true;

  console.log(user);

  const adminName = clients.find((client) => client.isAdmin)?.name;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target;
    const question = form[0].value;
    const answers = Array.from(form)
      .slice(1, 5)
      .map((input, idx) => ({
        index: idx,
        answer: input.value,
      }));

    const correct = answers[form[6].value];

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

  const handleDelete = (createdAt: string) => {
    const newQuestions = questions.filter(
      (question) => question.createdAt !== createdAt
    );

    setQuestions(newQuestions);
  };

  const handleEdit = (e: SubmitEvent, createdAt: string) => {
    e.preventDefault();
    const form = e.target;
    const question = form[0].value;
    const answers = Array.from(form)
      .slice(1, 5)
      .map((input, idx) => ({
        index: idx,
        answer: input.value,
      }));

    const correct = answers[form[6].value];

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
          <Box>
            <div className="heading">
              <h2>
                Hello <span>{user.name}</span>, you are <span>hosting</span>{' '}
                lobby <span>{lobby}</span>{' '}
                {clients.length > 1 && (
                  <>
                    with <span>{clients.length - 1}</span> other player(s).
                  </>
                )}
              </h2>
            </div>
          </Box>
          <div className="questions">
            {questions.length > 0 && (
              <>
                <Callout.Root color="gray" variant="outline">
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    You currently have{' '}
                    <span style={{ fontWeight: 'bold' }}>
                      {questions.length}
                    </span>{' '}
                    question(s). When you have finished adding questions, press
                    the 'continue' button below to proceed.
                  </Callout.Text>
                  <Callout.Text>
                    Click on a question to edit it. You will need admin
                    privileges to install and access this application.
                  </Callout.Text>
                </Callout.Root>
              </>
            )}
            <Button onClick={() => setIsSetup(!isSetup)}>
              {isSetup ? 'Hide' : 'Show'} new question form
            </Button>
            <div className="questions-list-container">
              {questions.map((question, index) => (
                <div key={question.createdAt}>
                  <button
                    className="question-title-ghost-button"
                    onClick={() => toggleEdit(question.createdAt)}
                  >
                    {question.question} - {question.correct.answer}
                  </button>
                  {question.isEditing && (
                    <QuestionForm
                      handleSubmit={(e) => handleEdit(e, question.createdAt)}
                      question={question}
                      handleDelete={handleDelete}
                    />
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
                    Save questions for later
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
          <>
            <QuestionForm handleSubmit={handleSubmit} />
          </>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Spinner size="2" />
            <p style={{ margin: 0 }}>
              Your host <span style={{ fontWeight: 'bold' }}>{adminName}</span>
              is currently setting up the questions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameLobby;
