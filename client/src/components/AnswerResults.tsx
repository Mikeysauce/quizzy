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

  return (
    <div>
      <h2>Answer Results</h2>
      <p>Question: {currentQuestion.question}</p>
      <p>Correct Answer: {currentQuestion.correct.answer}</p>
      <ul>
        {currentQuestion.users.map((user) => (
          <li key={user.id}>
            {user.name || 'Anonymous'} -{' '}
            {user.score > 0 ? 'Correct' : 'Incorrect'}
          </li>
        ))}
      </ul>
    </div>
  );
};
