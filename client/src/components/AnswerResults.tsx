import { Progress } from '@radix-ui/themes';
import * as RadioGroup from '@radix-ui/react-radio-group';
import styles from './Game.module.scss';
import * as Label from '@radix-ui/react-label';

export interface AnswerResultsProps {
  users: { id: string; name?: string; score: number }[];
  questions: {
    question: string;
    answers: string[];
    correct: string;
    createdAt: string;
  }[];
  currentQuestionId: string;
}

export const AnswerResults: React.FC<AnswerResultsProps> = (props) => {
  const currentQuestion = props.questions.find((q) => q.isActive);

  if (!currentQuestion) {
    return <p>Question not found</p>;
  }

  const { question, createdAt, answers, correct, users, imagePath } =
    currentQuestion;

  return (
    <>
      <div>
        <Progress duration="10s" />
      </div>
      <div>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{question}</h2>
        </div>
        <div className={styles.cardContent}>
          {imagePath && (
            <div className={styles.imageContainer}>
              <img src={imagePath} alt="Quiz question image" />
            </div>
          )}
          <p>Correct Answer: {correct.answer}</p>
          <ul>
            {currentQuestion.users.map((user) => (
              <li key={user.id}>
                {user.name || 'Anonymous'} -{' '}
                {user.score > 0 ? 'Correct' : 'Incorrect'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};
