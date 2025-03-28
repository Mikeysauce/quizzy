import { motion } from 'framer-motion';
import { Button } from '@radix-ui/themes';
import {
  Trophy,
  Medal,
  List,
  Crown,
  Star,
  CheckCircle,
  X,
} from 'phosphor-react';
import { useEffect, useState } from 'react';

export const GameResults = (props: {
  questions: any[];
  onRestart?: () => void;
  userId?: string;
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Determine the overall winner and scores
  const users = props.questions.reduce(
    (acc: any, question: { users: any[] }) => {
      question.users?.forEach((user: { id: any; score: any; name: any }) => {
        const existingUser = acc.find((u: { id: any }) => u.id === user.id);

        if (existingUser) {
          existingUser.score += user.score;
        } else if (user.id) {
          acc.push({ ...user });
        }
      });

      return acc;
    },
    []
  );

  // Sort users by score in descending order
  const sortedUsers = [...users].sort((a, b) => b.score - a.score);

  // Find users with the top score
  const topScore = sortedUsers.length > 0 ? sortedUsers[0].score : 0;
  const tiedWinners = sortedUsers.filter((user) => user.score === topScore);
  const isTie = tiedWinners.length > 1;

  // Determine if current user is among the winners
  const isCurrentUserWinner = tiedWinners.some(
    (user) => user.id === props.userId
  );

  // Get the winner info
  const winner = {
    name: isTie
      ? tiedWinners.map((u) => u.name).join(' & ')
      : sortedUsers.length > 0
      ? sortedUsers[0].name
      : '',
    score: topScore,
    isTie: isTie,
  };

  // Calculate ranks accounting for ties
  const userRanks = {};
  let currentRank = 0;
  let previousScore = -1;
  let skipCount = 0;

  sortedUsers.forEach((user, index) => {
    if (user.score !== previousScore) {
      currentRank = index + 1 - skipCount;
      previousScore = user.score;
    } else {
      // Same score as previous user, so keep the rank the same
      skipCount++;
    }
    userRanks[user.id] = currentRank;
  });

  // Find current user's rank
  const currentUserRank = userRanks[props.userId];

  // Calculated stats
  const totalQuestions = props.questions.length || 0;
  const currentUserScore =
    sortedUsers.find((u) => u.id === props.userId)?.score || 0;
  const correctPercentage =
    totalQuestions > 0
      ? Math.round((currentUserScore / totalQuestions) * 100)
      : 0;

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const staggerList = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const listItem = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // Trigger confetti periodically if user is winner
  useEffect(() => {
    if (isCurrentUserWinner) {
      const interval = setInterval(() => {
        // Dispatch custom event for small confetti burst
        window.dispatchEvent(new CustomEvent('quizzy:smallConfetti'));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isCurrentUserWinner]);

  return (
    <div className="game-results">
      {/* Hero section with winner announcement */}
      <motion.div
        className="results-hero"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.div
          className="trophy-container"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{
            scale: { duration: 0.5 },
            rotate: { duration: 1.5, delay: 0.5 },
          }}
        >
          {isCurrentUserWinner ? (
            isTie ? (
              <Trophy size={80} weight="fill" color="#FFD700" />
            ) : (
              <Crown size={80} weight="fill" color="#FFD700" />
            )
          ) : (
            <Trophy size={80} weight="fill" color="#FFD700" />
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {isCurrentUserWinner
            ? isTie
              ? "You're in a Tie!"
              : "You're the Champion!"
            : 'Game Complete!'}
        </motion.h1>

        <motion.div
          className="winner-announcement"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {winner.name ? (
            <>
              <h2 className="winner-title">
                {winner.isTie ? "It's a tie between" : 'Winner'}
              </h2>
              <div className="winner-name-container">
                <motion.span
                  className="winner-name"
                  initial={{ backgroundPosition: '200% 0' }}
                  animate={{ backgroundPosition: '0% 0' }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                >
                  {winner.name}
                </motion.span>
                <span className="winner-score">with {winner.score} points</span>
              </div>
            </>
          ) : (
            <h2>No winner determined</h2>
          )}
        </motion.div>
      </motion.div>

      {/* Your performance card */}
      <motion.div
        className="your-performance"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <h3>Your Performance</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">
              {getOrdinalSuffix(currentUserRank)}
            </div>
            <div className="stat-label">Place</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentUserScore}</div>
            <div className="stat-label">Points</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{correctPercentage}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
        </div>
      </motion.div>

      {/* Main content area with tabs */}
      <div className="results-tabs">
        <button
          className={`tab-button ${!showDetails ? 'active' : ''}`}
          onClick={() => setShowDetails(false)}
        >
          <Medal size={20} weight="fill" />
          Leaderboard
        </button>
        <button
          className={`tab-button ${showDetails ? 'active' : ''}`}
          onClick={() => setShowDetails(true)}
        >
          <List size={20} weight="fill" />
          Question Details
        </button>
      </div>

      <div className="results-content">
        {!showDetails ? (
          <motion.div
            className="leaderboard-section"
            variants={staggerList}
            initial="hidden"
            animate="show"
          >
            {sortedUsers.map((user, index) => {
              // Use the pre-calculated rank from userRanks object
              const rank = userRanks[user.id];

              return (
                <motion.div
                  key={user.id || index}
                  variants={listItem}
                  className={`leaderboard-item ${
                    props.userId === user.id ? 'current-user' : ''
                  } ${
                    rank === 1
                      ? 'first-place'
                      : rank === 2
                      ? 'second-place'
                      : rank === 3
                      ? 'third-place'
                      : ''
                  }`}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="rank">
                    {rank < 4 ? (
                      <Star
                        size={24}
                        weight="fill"
                        color={
                          rank === 1
                            ? '#FFD700'
                            : rank === 2
                            ? '#C0C0C0'
                            : '#CD7F32'
                        }
                      />
                    ) : (
                      <span className="rank-number">{rank}</span>
                    )}
                  </div>
                  <div className="user-info">
                    <span className="user-name">
                      {user.name || 'Anonymous'}
                    </span>
                    {props.userId === user.id && (
                      <span className="you-badge">YOU</span>
                    )}
                  </div>
                  <span className="user-score">{user.score} pts</span>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            className="questions-details"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {props.questions.map((question, qIndex) => (
              <motion.div
                key={question.createdAt || qIndex}
                variants={item}
                className="question-card"
              >
                <div className="question-header">
                  <span className="question-number">Q{qIndex + 1}</span>
                  <h4 className="question-text">{question.question}</h4>
                </div>

                <div className="correct-answer">
                  <CheckCircle size={18} weight="fill" color="#10B981" />
                  <span>{question.correct?.answer}</span>
                </div>

                {question.users && question.users.length > 0 && (
                  <div className="user-answers">
                    <h5>Player Answers</h5>
                    <div className="answers-grid">
                      {question.users.map((user: any, uIndex: number) => {
                        const isCurrentUser = user.id === props.userId;
                        return (
                          <div
                            key={uIndex}
                            className={`user-answer ${
                              user.score > 0 ? 'correct' : 'incorrect'
                            } ${isCurrentUser ? 'current-user' : ''}`}
                          >
                            <div className="answer-icon">
                              {user.score > 0 ? (
                                <CheckCircle size={16} weight="fill" />
                              ) : (
                                <X size={16} weight="bold" />
                              )}
                            </div>
                            <span className="answer-name">
                              {user.name || 'Anonymous'}
                              {isCurrentUser && (
                                <span className="you-tag">YOU</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <motion.div
        className="results-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <Button
          size="4"
          onClick={props.onRestart || (() => window.location.reload())}
          className="play-again-button"
        >
          <motion.span
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Play Again
          </motion.span>
        </Button>
      </motion.div>
    </div>
  );
};

// Helper function for ordinal suffixes (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n) {
  // Handle ties by adding special case for undefined/null
  if (n === undefined || n === null) return '';

  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
