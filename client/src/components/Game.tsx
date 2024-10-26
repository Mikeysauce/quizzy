import * as RadioGroup from '@radix-ui/react-radio-group';
import { Button } from '@radix-ui/themes';
import {
  JSXElementConstructor,
  ReactElement,
  ReactNode,
  useState,
} from 'react';

interface GameProps {
  questions: {
    question: string;
    answers: string[];
    isActive: boolean;
    createdAt: string;
  }[];
  sendAnswerToServer: (createdAt: string, answer: string) => void;
}

function Game({ questions, sendAnswerToServer }: GameProps) {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const currentQuestion = questions.find((question) => question.isActive);

  if (!currentQuestion) {
    return <p>uhoh</p>;
  }

  const handleSubmit = (e: { preventDefault: () => void; target: any }) => {
    e.preventDefault();
    const form = e.target;
    const answer = form.querySelector('input[type="radio"]:checked').value;

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
            {currentQuestion.answers.map(({ answer, index }) => {
              return (
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
              );
            })}
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

export default Game;
