import { motion } from 'framer-motion';
import { Button } from '@radix-ui/themes';
import { Trophy, Medal, List } from 'phosphor-react';

export const GameResults = (props: { questions: any[] }) => {
  // determine the overall winner. However, it is possible for multiple users to have the same score.
  const users = props.questions.reduce(
    (acc: any[], question: { users: any[] }) => {
      question.users?.forEach((user: { id: any; score: any; name: any }) => {
        const existingUser = acc.find((u: { id: any }) => u.id === user.id);

        if (existingUser) {
          existingUser.score += user.score;
        } else if (user.id) {
          // Make sure user has an ID
          acc.push({ ...user });
        }
      });

      return acc;
    },
    []
  );

  // Sort users by score in descending order
  const sortedUsers = [...users].sort((a, b) => b.score - a.score);

  const winner = users.reduce(
    (acc: { score: number; name: any }, user: { score: number; name: any }) => {
      if (user.score > acc.score) {
        return user;
      }

      if (user.score === acc.score && acc.score > 0) {
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="results-container">
      <motion.div
        className="results-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Game Over!</h1>
        <div className="winner-card">
          <Trophy size={48} weight="fill" color="#FFD700" />
          <h2>
            {winner.name ? (
              <>
                {winner.isTie ? "It's a tie! " : 'Winner: '}
                <span className="winner-name">{winner.name}</span>
                <span className="winner-score">({winner.score} points)</span>
              </>
            ) : (
              'No winner determined'
            )}
          </h2>
        </div>
      </motion.div>

      <div className="results-content">
        <motion.div
          className="leaderboard"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3>
            <Medal size={24} weight="fill" />
            Leaderboard
          </h3>
          <ul className="leaderboard-list">
            {sortedUsers.map((user, index) => (
              <motion.li
                key={user.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`leaderboard-item ${
                  index === 0
                    ? 'gold'
                    : index === 1
                    ? 'silver'
                    : index === 2
                    ? 'bronze'
                    : ''
                }`}
              >
                <span className="position">{index + 1}</span>
                <span className="name">{user.name || 'Anonymous'}</span>
                <span className="score">{user.score} pts</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="questions-summary"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <h3>
            <List size={24} weight="fill" />
            Questions Summary
          </h3>

          {props.questions.map((question, qIndex) => (
            <motion.div
              key={question.createdAt || qIndex}
              className="question-card"
              variants={item}
            >
              <h4>
                <span className="question-number">Q{qIndex + 1}:</span>{' '}
                {question.question}
              </h4>
              <div className="answer-info">
                <div className="correct-answer">
                  <span className="label">Correct answer:</span>
                  <span className="value">{question.correct?.answer}</span>
                </div>

                {question.users && question.users.length > 0 && (
                  <ul className="answers-list">
                    {question.users.map((user: any, uIndex: number) => (
                      <li
                        key={uIndex}
                        className={user.score > 0 ? 'correct' : 'incorrect'}
                      >
                        {user.name || 'Anonymous'} -{' '}
                        {user.score > 0 ? '✅ Correct' : '❌ Incorrect'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="results-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Button size="3" onClick={() => window.location.reload()} color="green">
          Play Again
        </Button>
      </motion.div>
    </div>
  );
};
