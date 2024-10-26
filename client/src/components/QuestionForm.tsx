import { Button, Select } from '@radix-ui/themes';
import { Label } from '@radix-ui/themes/dist/esm/components/context-menu.js';
import { useState } from 'react';

interface QuestionFormProps {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleDelete: (createdAt: string) => void;
  question?: Question;
}

interface Question {
  question: {
    question: string;
    answers: Answer[];
    createdAt: string;
    isEditing: boolean;
  };
  answers: Answer[];
  correct: {
    index: number;
    answer: string;
  };
  createdAt: string;
  isEditing: boolean;
}

interface Answer {
  index: number;
  answer: string;
}

const QuestionForm = ({
  handleSubmit,
  handleDelete,
  question,
}: QuestionFormProps) => {
  const [answers, setAnswers] = useState<Answer[]>(
    question ? question.answers : []
  );

  const [correctAnswer, setCorrectAnswer] = useState<string | number>(
    question ? question.correct.index : ''
  );

  const mode: 'add' | 'edit' =
    question && Object.keys(question).length > 0 ? 'edit' : 'add';

  const handleAnswer = ({ answer }: { answer: Answer }) => {
    const newAnswers = [...answers];
    newAnswers[answer.index] = answer;
    setAnswers(newAnswers);
  };

  const handleDeleteQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleDelete(question?.createdAt);
  };

  if (mode === 'edit') {
    return (
      <div>
        <h4>Edit question</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <input
              type="text"
              placeholder="Question"
              value={question?.question}
            />
            {question?.answers.map((answer) => (
              <input
                key={answer.index}
                type="text"
                placeholder={`Answer ${answer.index}`}
                onChange={(e) =>
                  handleAnswer({
                    answer: { answer: e.target.value, index: answer.index },
                  })
                }
                value={
                  answers[answers.findIndex((a) => a.index === answer.index)]
                    ?.answer
                }
              />
            ))}
            {answers.length === 4 && (
              <>
                <Label style={{ color: '#1e1e1e' }}>Correct answer</Label>
                <Select.Root
                  value={correctAnswer.toString()}
                  onValueChange={(value) => setCorrectAnswer(Number(value))}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Group>
                      <Select.Label>Answer</Select.Label>
                      {answers.map((answer) => (
                        <Select.Item
                          key={answer.index}
                          value={answer.index.toString()}
                        >
                          {answer.answer}
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </>
            )}
            <div style={{ display: 'flex', gap: 5 }}>
              <div style={{ marginTop: '5px' }}>
                <Button type="submit">Save question</Button>
              </div>
              <div style={{ marginTop: '5px' }}>
                <Button
                  type="submit"
                  color="ruby"
                  onClick={handleDeleteQuestion}
                >
                  Delete question
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'add') {
    return (
      <div>
        <h4>Add a question</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <input type="text" placeholder="Question" />
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                type="text"
                placeholder={`Answer ${index}`}
                onChange={(e) =>
                  handleAnswer({ answer: { answer: e.target.value, index } })
                }
                value={
                  answers[answers.findIndex((a) => a.index === index)]?.answer
                }
              />
            ))}
            {answers.length === 4 && (
              <>
                <Label style={{ color: '#1e1e1e' }}>Correct answer</Label>
                <Select.Root>
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Group>
                      <Select.Label>Answer</Select.Label>
                      {answers.map((answer) => (
                        <Select.Item
                          key={answer.index}
                          value={answer.index.toString()}
                        >
                          {answer.answer}
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </>
            )}
            <div style={{ marginTop: '5px' }}>
              <Button type="submit">Save question</Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h4>Edit mode</h4>
    </div>
  );
};

export default QuestionForm;
