import * as RadioGroup from '@radix-ui/react-radio-group';
import { Button } from '@radix-ui/themes';
import {
  JSXElementConstructor,
  ReactElement,
  ReactNode,
  useState,
} from 'react';
import styles from './game.module.scss';
import * as Label from '@radix-ui/react-label';

interface Question {
  imagePath?: string;
  isActive: boolean;
  createdAt: string;
  question: string;
  answers: string;
  correct: {
    answer: string;
    index: number;
  };
}

interface GameProps {
  questions: Question[];
  sendAnswerToServer: (createdAt: string, answer: string) => void;
}

function Game({ questions, sendAnswerToServer }: GameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const currentQuestion = questions.find((question) => question.isActive);

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
            <img src={imagePath} alt="Quiz question image" />
          </div>
        )}
        <RadioGroup.Root
          onValueChange={setSelectedAnswer}
          className={styles.radioGroup}
          disabled={false}
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
                  hasSubmitted
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
      </div>
      <div className={styles.cardFooter}>
        <button
          type="submit"
          disabled={!selectedAnswer || hasSubmitted}
          className={styles.submitButton}
        >
          {hasSubmitted ? 'Submitted' : 'Submit Answer'}
        </button>
      </div>

      {hasSubmitted && (
        <div className={styles.cardWaiting}>
          <p>Your answer has been submitted, waiting for other players!</p>
        </div>
      )}
    </form>
  );

  // return (
  //   <div>
  //     <div>
  //       <h2>{currentQuestion.question}</h2>

  //       <form onSubmit={handleSubmit}>
  //         <RadioGroup.Root
  //           className="RadioGroupRoot"
  //           defaultValue="default"
  //           aria-label="View density"
  //         >
  //           {currentQuestion.answers.map(({ answer, index }) => {
  //             return (
  //               <div style={{ display: 'flex', alignItems: 'center' }}>
  //                 <RadioGroup.Item
  //                   className="RadioGroupItem"
  //                   value={answer}
  //                   id={`r${index + 1}`}
  //                 >
  //                   <RadioGroup.Indicator className="RadioGroupIndicator" />
  //                 </RadioGroup.Item>
  //                 <label className="Label" htmlFor={`r${index + 1}`}>
  //                   {answer}
  //                 </label>
  //               </div>
  //             );
  //           })}
  //         </RadioGroup.Root>

  //         <div style={{ margin: '1rem 0' }}>
  //           <Button type="submit" disabled={hasSubmitted}>
  //             Submit
  //           </Button>
  //           {hasSubmitted && (
  //             <div>
  //               <p>
  //                 Your answer has been submitted, waiting for other players!
  //               </p>
  //             </div>
  //           )}
  //         </div>
  //       </form>
  //     </div>
  //   </div>
  // );
}

export default Game;
