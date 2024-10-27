import express, { Application } from 'express';
import { createServer } from 'http';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app: Application = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const port = process.env.PORT ?? 3000;

// Generated by https://quicktype.io

export interface Qt {
  type: string;
  questions: Question[];
}

export interface Question {
  question: string;
  answers: string[];
  correct: string;
  createdAt: string;
  isEditing: boolean;
}

interface User {
  id: string;
  ws: WebSocket;
  isAdmin: boolean;
  score: number;
  name?: string;
  answers: Record<string, string[]>;
}

let currentQuestion = 0;
let users: Record<string, User> = {};
let gameStarted = false;
let questionMap = new Map<string, Question[]>();

const storeQuestionsInMemory = (lobby: string, questions: Question[]) => {
  questionMap.set(lobby, questions);
};

const getQuestionsFromMemory = (lobby: string): Question[] => {
  return questionMap.get(lobby)!;
};

// app.use(express.static('public'));

const createUser = (name: string, lobby: string) => ({
  name,
  id: uuidv4(),
  isAdmin: Object.keys(users).length === 0,
  answers: {
    [lobby]: {},
  },
});

const broadcastQuestionsToAllClients = (questions: Question[]) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'questions', questions }));
    }
  });
};

const transitionToNextQuestionOrEndGameIfNoQuestionsRemaining = (
  lobby: string
) => {
  const questions = getQuestionsFromMemory(lobby);

  console.log('questions', questions);

  const currQuestionIdx = questions.findIndex((q) => q.isActive);

  if (currQuestionIdx === questions.length - 1) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'gameOver' }));
      }
    });

    return;
  }

  questions[currQuestionIdx].isActive = false;
  questions[currQuestionIdx + 1].isActive = true;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'questions',
          questions: structuredClone(questions),
        })
      );
    }
  });
};

const broadcastAnswerResults = (lobby: string, questionId: string) => {
  const questions = getQuestionsFromMemory(lobby);
  const questionIdx = questions.findIndex((q) => q.createdAt === questionId);
  const question = questions[questionIdx];

  if (!question) {
    console.error(`Question with ID ${questionId} not found`);
    return;
  }

  const usersWithCorrectAnswer = Object.values(users).map((user) => {
    const answer = user.answers[lobby]?.[questionId];

    return {
      id: user.id,
      name: user.name,
      score: answer === question.correct.answer ? 1 : 0,
    };
  });

  usersWithCorrectAnswer.forEach((user) => {
    users[user.id].score += user.score;
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'answerResults',
          questionId,
          correctAnswer: question.correct,
          users: usersWithCorrectAnswer,
        })
      );

      setTimeout(
        () => transitionToNextQuestionOrEndGameIfNoQuestionsRemaining(lobby),
        10000
      );
    }
  });

  const newQuestions = structuredClone(questions);

  newQuestions[questionIdx].users = usersWithCorrectAnswer;

  storeQuestionsInMemory(lobby, newQuestions);
};

const checkThatAllUsersHaveAnswered = (lobby: string, questionId: string) => {
  const usersWhoHaveAnswered = Object.values(users).filter(
    (user) => user.answers[lobby][questionId]
  );

  if (usersWhoHaveAnswered.length === Object.keys(users).length) {
    broadcastAnswerResults(lobby, questionId);
  }

  // check each users answers and ensure they all have
};

wss.on('connection', (ws: WebSocket) => {
  let userId: string;
  // const userId = uuidv4();
  // const isAdmin = Object.keys(users).length === 0;
  // users[userId] = { id: userId, ws, isAdmin, score: 0 };

  console.log(`New client connected`);

  // ws.send(JSON.stringify({ type: 'welcome', userId, isAdmin }));
  // broadcastClients();

  ws.on('message', (message: string) => {
    const data = JSON.parse(message);
    if (!data) return;

    console.log('data', data);

    if (data.type === 'setName') {
      const user = createUser(data.name, data.lobby);
      userId = user.id;
      users[user.id] = user;

      broadcastClients();
      broadcastUpdateUser(user);
    }

    if (data.type === 'questions') {
      storeQuestionsInMemory(data.lobby, data.questions);
      data.questions[0].isActive = true;
      broadcastQuestionsToAllClients(data.questions);
    }

    if (data.type === 'answer') {
      // we record a users answer and check if all users have answered.
      const user = users[data.userId];
      user.answers[data.lobby][data.questionId] = data.answer;

      checkThatAllUsersHaveAnswered(data.lobby, data.questionId);
    }
  });

  ws.on('close', (x) => {
    console.log(`Client disconnected: ${userId}`);
    delete users[userId];

    gameStarted = false;

    ensureAdminExists();
    broadcastClients();
  });
});

function broadcastUpdateUser(user: User): void {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'updateUser',
          id: user.id,
          isAdmin: user.isAdmin,
          score: user.score,
          ...(user.name && { name: user.name }),
          answers: user.answers,
        })
      );
    }
  });
}

function broadcastClients(): void {
  const clientList = Object.values(users).map((user) => ({
    id: user.id,
    isAdmin: user.isAdmin,
    score: user.score,
    ...(user.name && { name: user.name }),
    answers: user.answers,
  }));

  console.log('clientList', clientList);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'clients', clients: clientList }));
    }
  });
}

function ensureAdminExists(): void {
  const adminExists = Object.values(users).some((user) => user.isAdmin);
  if (!adminExists && Object.keys(users).length > 0) {
    const newAdminId = Object.keys(users)[0];
    users[newAdminId].isAdmin = true;
  }
}

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
