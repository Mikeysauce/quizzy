import express, { Application } from 'express';
import multer from 'multer';
import { createServer } from 'http';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import basicAuth from 'express-basic-auth';
import cors from 'cors';
import bodyParser from 'body-parser';

const app: Application = express();

app.use(cors());
app.use(bodyParser.json());

interface CustomRequest extends Request {
  file: Express.Multer.File; // Use the correct type for multer
}

const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD } = process.env;

if (BASIC_AUTH_USERNAME && BASIC_AUTH_PASSWORD) {
  app.use(
    basicAuth({
      users: { [BASIC_AUTH_USERNAME]: BASIC_AUTH_PASSWORD },
      challenge: true,
    })
  );
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;

  if (file) {
    res.send({
      message: 'File uploaded successfully',
      path: file.path.replaceAll('\\', '/'),
    });
  }

  console.log(file);
});

console.log('paff', path.join(__dirname, 'uploads'));

app.use('/uploads', express.static(path.join(__dirname, '../', 'uploads')));

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
  ws: WebSocket; // This reference needs to be properly maintained
  isAdmin: boolean;
  score: number;
  name?: string;
  answers: Record<string, string[]>;
  ready?: boolean;
}

let currentQuestion = 0;
let users: Record<string, User> = {};
let gameStarted = false;
let questionMap = new Map<string, Question[]>();
let gameEndedLobbies = new Set<string>(); // Track lobbies where game has ended

const storeQuestionsInMemory = (lobby: string, questions: Question[]) => {
  questionMap.set(lobby, questions);
};

const getQuestionsFromMemory = (lobby: string): Question[] => {
  return questionMap.get(lobby)!;
};

// app.use(express.static('public'));

const createUser = (name: string, lobby: string) => {
  // Get only users in this lobby - reliable implementation
  const usersInLobby = Object.values(users).filter(
    (user) =>
      user.answers &&
      typeof user.answers === 'object' &&
      Object.keys(user.answers).includes(lobby)
  );

  // Create and return a new user with the appropriate initial state
  return {
    name,
    id: uuidv4(),
    isAdmin: usersInLobby.length === 0, // First user in the lobby becomes admin
    score: 0, // Initialize score
    answers: {
      [lobby]: {},
    },
  };
};

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
  if (!questions || !Array.isArray(questions)) {
    console.error(`No questions found for lobby ${lobby}`);
    return;
  }

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
  if (!questions) {
    console.error(`No questions found for lobby ${lobby}`);
    return;
  }

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
    if (users[user.id]) {
      users[user.id].score += user.score;
    }
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
    }
  });

  const newQuestions = structuredClone(questions);
  newQuestions[questionIdx].users = usersWithCorrectAnswer;
  storeQuestionsInMemory(lobby, newQuestions);

  // Reset readiness state for all users in this lobby
  Object.values(users).forEach((user) => {
    if (user.answers && Object.keys(user.answers).includes(lobby)) {
      user.ready = false;
    }
  });

  // Broadcast updated clients with ready state
  broadcastClients(lobby);
};

// New function to check if all clients are ready
const checkAllClientsReady = (lobby: string) => {
  const lobbyUsers = Object.values(users).filter(
    (user) => user.answers && Object.keys(user.answers).includes(lobby)
  );

  return lobbyUsers.length > 0 && lobbyUsers.every((user) => user.ready);
};

const checkThatAllUsersHaveAnswered = (lobby: string, questionId: string) => {
  const lobbyUsers = Object.values(users).filter(
    (user) => user.answers && Object.keys(user.answers).includes(lobby)
  );

  const usersWhoHaveAnswered = lobbyUsers.filter(
    (user) => user.answers[lobby] && user.answers[lobby][questionId]
  );

  if (
    usersWhoHaveAnswered.length === lobbyUsers.length &&
    lobbyUsers.length > 0
  ) {
    broadcastAnswerResults(lobby, questionId);
  }

  // check each users answers and ensure they all have
};

wss.on('connection', (ws: WebSocket) => {
  let userId: string;
  console.log(`New client connected`);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      if (!data) return;

      console.log('Received message:', data);

      if (data.type === 'setName') {
        console.log('Processing setName:', data);

        if (!data.lobby || !data.name) {
          console.error('Missing required fields in setName message:', data);
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'missing_fields',
              message: 'Name and lobby are required.',
            })
          );
          return;
        }

        // Get only users in this lobby with reliable filtering
        const usersInLobby = Object.values(users).filter(
          (user) =>
            user.answers &&
            typeof user.answers === 'object' &&
            Object.keys(user.answers).includes(data.lobby)
        );

        // Check for duplicate username with safe comparison
        const isUsernameTaken = usersInLobby.some(
          (user) =>
            user.name && user.name.toLowerCase() === data.name.toLowerCase()
        );

        if (isUsernameTaken) {
          console.log(
            `Username '${data.name}' is already taken in lobby '${data.lobby}'`
          );
          // Send error back to client
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'username_taken',
              message:
                'This username is already in use. Please choose another one.',
            })
          );
          return;
        }

        console.log(`Creating new user: ${data.name} in lobby: ${data.lobby}`);
        // Create new user
        const user = createUser(data.name, data.lobby);
        userId = user.id;

        // Store the WebSocket connection with the user
        users[user.id] = { ...user, ws, score: 0 };

        console.log(
          `User created successfully: ${user.id}, Admin: ${user.isAdmin}`
        );

        // Send an immediate confirmation back to this client
        ws.send(
          JSON.stringify({
            type: 'nameConfirmed',
            userId: user.id,
            isAdmin: user.isAdmin,
            name: user.name,
          })
        );

        // Then broadcast to everyone
        broadcastClients(data.lobby);
        broadcastUpdateUser(users[user.id]);
      }

      if (data.type === 'questions') {
        storeQuestionsInMemory(data.lobby, data.questions);
        data.questions[0].isActive = true;
        broadcastQuestionsToAllClients(data.questions);
      }

      if (data.type === 'answer') {
        // we record a users answer and check if all users have answered.
        const user = users[data.userId];
        if (user && user.answers) {
          if (!user.answers[data.lobby]) {
            user.answers[data.lobby] = {};
          }
          user.answers[data.lobby][data.questionId] = data.answer;
          checkThatAllUsersHaveAnswered(data.lobby, data.questionId);
        }
      }

      // New client controls
      if (data.type === 'setReady') {
        const user = users[data.userId];
        if (user) {
          user.ready = data.ready;
          broadcastClients(data.lobby);

          // If all clients are ready and requester is admin, progress the game
          if (data.ready && user.isAdmin && checkAllClientsReady(data.lobby)) {
            transitionToNextQuestionOrEndGameIfNoQuestionsRemaining(data.lobby);
          }
        }
      }

      if (data.type === 'nextQuestion' && users[data.userId]?.isAdmin) {
        transitionToNextQuestionOrEndGameIfNoQuestionsRemaining(data.lobby);
      }

      if (data.type === 'requestGameState') {
        const questions = getQuestionsFromMemory(data.lobby);
        if (questions && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'gameState',
              questions: structuredClone(questions),
              currentQuestion: questions.findIndex((q) => q.isActive),
            })
          );
        }
      }

      // In your WebSocket message handler, add this new case:
      if (data.type === 'forceGameEnd' && data.final === true) {
        console.log(
          `User ${data.userId} requested FORCED game end for ALL players`
        );

        // Broadcast game over to ALL clients immediately
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            // Send with high priority flag
            client.send(
              JSON.stringify({
                type: 'gameOver',
                forced: true,
                timestamp: Date.now(),
              })
            );
          }
        });
      }

      if (data.type === 'gameOver' || data.type === 'forceGameEnd') {
        // Mark this lobby as having a completed game
        if (data.lobby) {
          gameEndedLobbies.add(data.lobby);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'invalid_message',
          message: 'Failed to process message.',
        })
      );
    }
  });

  ws.on('close', () => {
    if (!userId) return;

    console.log(`Client disconnected: ${userId}`);

    // Get user's lobby before removing the user
    const userLobby =
      userId && users[userId] && users[userId].answers
        ? Object.keys(users[userId].answers || {})[0]
        : null;

    const wasAdmin = users[userId]?.isAdmin || false;

    delete users[userId];
    gameStarted = false;

    // Only ensure admin exists if the game hasn't ended in this lobby
    if (userLobby && !gameEndedLobbies.has(userLobby)) {
      ensureAdminExists(userLobby);
      if (wasAdmin) {
        console.log(`Admin left lobby ${userLobby}, reassigning admin`);
      }
    }

    if (userLobby) {
      broadcastClients(userLobby);
    }
  });
});

// Add this new HTTP endpoint for force ending games
app.post('/api/endGame', (req, res) => {
  const { lobby } = req.body;
  console.log(`Force ending game for lobby ${lobby} via HTTP endpoint`);

  // Broadcast gameOver to ALL clients in this lobby
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'gameOver',
          forced: true,
          timestamp: Date.now(),
        })
      );
    }
  });

  res
    .status(200)
    .json({ success: true, message: 'Game ended for all clients' });
});

function broadcastUpdateUser(user: User): void {
  // Find the user's lobby
  const userLobby = user.answers ? Object.keys(user.answers)[0] : null;
  if (!userLobby) return;

  // Only notify users in the same lobby
  const usersInSameLobby = Object.values(users).filter(
    (u) => u.answers && Object.keys(u.answers).includes(userLobby)
  );

  usersInSameLobby.forEach((targetUser) => {
    if (targetUser.ws && targetUser.ws.readyState === WebSocket.OPEN) {
      targetUser.ws.send(
        JSON.stringify({
          type: 'updateUser',
          id: user.id,
          isAdmin: user.isAdmin,
          score: user.score,
          name: user.name,
          answers: user.answers,
        })
      );
    }
  });
}

// Modify broadcastClients to only broadcast to users in the specific lobby
function broadcastClients(lobby: string): void {
  // Filter users by lobby with reliable check
  const usersInLobby = Object.values(users).filter(
    (user) => user.answers && Object.keys(user.answers).includes(lobby)
  );

  const clientList = usersInLobby.map((user) => ({
    id: user.id,
    isAdmin: user.isAdmin,
    score: user.score,
    name: user.name,
    answers: user.answers,
    ready: user.ready || false,
  }));

  console.log(`Broadcasting to lobby ${lobby}:`, clientList);

  // Only send to users in this lobby
  usersInLobby.forEach((user) => {
    if (user.ws && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(
        JSON.stringify({
          type: 'clients',
          clients: clientList,
          lobby,
        })
      );
    }
  });
}

// Update ensureAdminExists to work with a specific lobby
function ensureAdminExists(lobby: string): void {
  const usersInLobby = Object.values(users).filter(
    (user) => user.answers && Object.keys(user.answers).includes(lobby)
  );

  const adminExists = usersInLobby.some((user) => user.isAdmin);

  // Check if we should assign a new admin
  if (!adminExists && usersInLobby.length > 0) {
    // Assign the first user in the lobby as admin
    const firstUserInLobby = usersInLobby[0];
    firstUserInLobby.isAdmin = true;

    console.log(
      `Assigned new admin in lobby ${lobby}: ${firstUserInLobby.name}`
    );

    // Notify all clients about the new admin
    broadcastUpdateUser(firstUserInLobby);
    broadcastClients(lobby);
  }
}

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
