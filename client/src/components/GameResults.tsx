import {
  ReactElement,
  JSXElementConstructor,
  ReactNode,
  ReactPortal,
} from 'react';

export const GameResults = (props: { questions: any[] }) => {
  // determine the overall winner. However, it is possible for multiple users to have the same score.
  const users = props.questions.reduce(
    (acc: any[], question: { users: any[] }) => {
      question.users.forEach((user: { id: any; score: any }) => {
        const existingUser = acc.find((u: { id: any }) => u.id === user.id);

        if (existingUser) {
          existingUser.score += user.score;
        } else {
          acc.push({ ...user });
        }
      });

      return acc;
    },
    []
  );

  const winner = users.reduce(
    (acc: { score: number; name: any }, user: { score: number; name: any }) => {
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
        {props.questions.map(
          (question: {
            question:
              | string
              | number
              | boolean
              | ReactElement<any, string | JSXElementConstructor<any>>
              | Iterable<ReactNode>
              | ReactPortal
              | null
              | undefined;
            correct:
              | string
              | number
              | boolean
              | ReactElement<any, string | JSXElementConstructor<any>>
              | Iterable<ReactNode>
              | ReactPortal
              | null
              | undefined;
            users: any[];
          }) => (
            <div>
              <h5>
                {question.question} - <span>{question.correct.answer}</span>
              </h5>
              <ul>
                {question.users.map((user: { name: any; score: number }) => (
                  <li>
                    {user.name || 'Anonymous'} -{' '}
                    {user.score > 0 ? 'Correct' : 'Incorrect'}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
};
