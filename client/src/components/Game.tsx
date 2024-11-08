import * as RadioGroup from '@radix-ui/react-radio-group';
import { Button, Progress } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import styles from './game.module.scss';
import * as Label from '@radix-ui/react-label';

interface Question {
  imagePath?: string;
  isActive: boolean;
  createdAt: string;
  question: string;
  answers: string[];
  correct: {
    answer: string;
    index: number;
  };
}

interface GameProps {
  questions: Question[];
  sendAnswerToServer: (createdAt: string, answer: string) => void;
  isResults: boolean;
}

function Game({ questions, sendAnswerToServer, isResults }: GameProps) {
  const initRef = useRef<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const currentQuestion = questions.find((question) => question.isActive);

  useEffect(() => {
    if (!initRef.current && currentQuestion) {
      initRef.current = currentQuestion;
    }

    if (
      initRef.current &&
      currentQuestion &&
      initRef.current.question !== currentQuestion.question
    ) {
      console.log('initRef', initRef.current);
      console.log('currentQuestion', currentQuestion);
      setHasSubmitted(false);
      setSelectedAnswer('');
      initRef.current = currentQuestion;
    }
  }, [currentQuestion]);

  if (!currentQuestion) {
    return <p>uhoh</p>;
  }

  const { question, createdAt, answers, correct, imagePath } = currentQuestion;

  const handleSubmit = (e: { preventDefault: () => void; target: any }) => {
    e.preventDefault();
    const form = e.target;
    const answer = form.querySelector('input[type="radio"]:checked').value;

    sendAnswerToServer(createdAt, answer);
    setHasSubmitted(true);
  };

  const correctAnswer = correct.answer;

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{question}</h2>
      </div>
      <div className={styles.cardContent}>
        {imagePath && (
          <div className={styles.imageContainer}>
            <img
              src={imagePath}
              alt="Quiz question image"
              className={styles.gamePhoto}
            />
          </div>
        )}
        <RadioGroup.Root
          onValueChange={setSelectedAnswer}
          className={styles.radioGroup}
          disabled={hasSubmitted || isResults}
        >
          {answers.map(({ answer, index }) => (
            <div key={index} className={styles.radioItem}>
              <RadioGroup.Item
                value={answer}
                id={`answer-${index}`}
                className={styles.radioGroupItem}
              >
                <RadioGroup.Indicator className={styles.radioGroupIndicator} />
              </RadioGroup.Item>
              <Label.Root
                htmlFor={`answer-${index}`}
                className={`${styles.label} ${
                  isResults
                    ? answer === correctAnswer
                      ? styles.correct
                      : answer === selectedAnswer
                      ? styles.incorrect
                      : styles.disabled
                    : ''
                }`}
              >
                {answer}
              </Label.Root>
            </div>
          ))}
        </RadioGroup.Root>
        <div className={styles.cardFooter}>
          {!isResults && (
            <button
              type="submit"
              disabled={!selectedAnswer || hasSubmitted}
              className={styles.submitButton}
            >
              {hasSubmitted ? 'Submitted' : 'Submit Answer'}
            </button>
          )}
        </div>
        {hasSubmitted && !isResults && (
          <div className={styles.cardWaiting}>
            <p>Your answer has been submitted, waiting for other players!</p>
          </div>
        )}
        {isResults && (
          <div>
            <Progress duration="10s" />
          </div>
        )}
      </div>
    </form>
  );
}

export default Game;
