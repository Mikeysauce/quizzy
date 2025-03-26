import * as RadioGroup from '@radix-ui/react-radio-group';
import { Progress, Button } from '@radix-ui/themes';
import { memo, useEffect, useRef, useState, useCallback } from 'react';
import styles from './game.module.scss';
import * as Label from '@radix-ui/react-label';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import axios from 'axios';

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
  forceNextQuestion?: () => void; // Add this prop
  isAdmin?: boolean;
}

function GameComponent({
  questions,
  sendAnswerToServer,
  isResults,
  isAdmin,
  forceNextQuestion,
}: GameProps) {
  // Use refs to prevent rerenders for logging
  const logRef = useRef({
    prevQuestions: null as Question[] | null,
    prevIsResults: null as boolean | null,
  });

  // Only log when important props change, not on every render
  if (
    questions !== logRef.current.prevQuestions ||
    isResults !== logRef.current.prevIsResults
  ) {
    console.log('Game component receiving new props', {
      questionsCount: questions.length,
      isResults,
      activeQuestion: questions.find((q) => q.isActive)?.question,
    });
    logRef.current = { prevQuestions: questions, prevIsResults: isResults };
  }

  const initRef = useRef<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [resultsShownTimestamp, setResultsShownTimestamp] = useState<
    number | null
  >(null);

  // Find the active question - wrapped in useRef to prevent rerenders
  const currentQuestionRef = useRef<Question | null>(null);
  currentQuestionRef.current =
    questions.find((question) => question.isActive) || null;
  const currentQuestion = currentQuestionRef.current;

  // Add function to check if this is the last question - MOVED UP
  const isLastQuestion = useCallback(() => {
    const activeIndex = questions.findIndex((q) => q.isActive);
    return activeIndex === questions.length - 1;
  }, [questions]);

  // Add a direct function to trigger game end - COMPLETELY REVISED
  const triggerGameEnd = useCallback(() => {
    console.log('EMERGENCY: Force ending game NOW');

    // 1. FIRST immediately transition state - this is the most critical part
    if (forceNextQuestion) {
      // Call twice to ensure it goes through
      forceNextQuestion();
      // Short timeout to ensure the first call has time to process
      setTimeout(() => {
        console.log('Second forced transition for reliability');
        forceNextQuestion();
      }, 100);
    }

    // 2. THEN make the HTTP request to notify other players
    const lobby = new URLSearchParams(window.location.search).get('lobby');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    // Show toast
    toast.success('Game completed! Viewing final results...', {
      icon: '🏆',
      duration: 5000,
    });

    // The HTTP request is secondary - the local transition is what matters
    axios
      .post(`${apiUrl}/api/endGame`, { lobby })
      .then(() => console.log('Server notified of game end'))
      .catch((error) =>
        console.error('Failed to notify server, but game ended locally', error)
      );
  }, [forceNextQuestion]);

  // Add a utility function to advance to next question
  const advanceToNextQuestion = useCallback(() => {
    if (!forceNextQuestion) return;

    // Find current active question
    const activeIndex = questions.findIndex((q) => q.isActive);
    console.log('Current active question index:', activeIndex);

    if (activeIndex === -1) {
      // No active question found, try to activate the first one
      if (questions.length > 0) {
        console.log('No active question found, activating first question');
        forceNextQuestion();
      }
      return;
    }

    // Check if there's a next question
    if (activeIndex < questions.length - 1) {
      console.log('Advancing to next question:', activeIndex + 1);
      forceNextQuestion();
    } else {
      // We're at the last question, trigger game end
      console.log('Reached end of questions, ending game directly');
      forceNextQuestion(); // This will handle game end logic in App.tsx
    }
  }, [questions, forceNextQuestion]);

  // Add a more reliable check for last question with fallback
  const isLastQuestionWithFallback = useCallback(() => {
    // First check using the standard method
    const activeIndex = questions.findIndex((q) => q.isActive);

    // If we found an active question and it's the last one
    if (activeIndex !== -1 && activeIndex === questions.length - 1) {
      return true;
    }

    // Fallback: If no active question is found but we've answered all questions except one
    const answeredQuestions = questions.filter(
      (q) => q.users && q.users.length > 0
    );
    return answeredQuestions.length === questions.length - 1;
  }, [questions]);

  // Check if we've completed all questions and notify server
  useEffect(() => {
    // Logic to detect when the game should end
    if (
      isResults &&
      questions.length > 0 &&
      !questions.some((q) => q.isActive) &&
      forceNextQuestion
    ) {
      console.log('All questions appear to be completed - notifying game over');

      // Wait briefly for the last results to be visible, then signal game completion
      const gameOverTimer = setTimeout(() => {
        // Signal to the parent that we need to end the game
        // This will cause App to tell the server the game is over
        forceNextQuestion();
        // No more custom event dispatching
      }, 5000);

      return () => clearTimeout(gameOverTimer);
    }
  }, [questions, isResults, forceNextQuestion]);

  // Auto-transition to next question - COMPLETELY SIMPLIFIED
  useEffect(() => {
    if (isResults) {
      // Set a shorter timer (3 seconds instead of 5)
      const timer = setTimeout(() => {
        console.log('Auto-timer fired');

        // Direct check for last question - much simpler
        if (isLastQuestion()) {
          console.log('LAST QUESTION DETECTED - Auto-ending game');
          triggerGameEnd();
        } else {
          console.log('Not last question - advancing normally');
          if (forceNextQuestion) forceNextQuestion();
        }
      }, 3000); // REDUCED from 5000 to 3000ms for faster response

      return () => clearTimeout(timer);
    }
  }, [isResults, isLastQuestion, triggerGameEnd, forceNextQuestion]);

  // Critical effect to handle changes in isResults - memoized with useCallback
  const handleResultsChange = useCallback(() => {
    if (isResults && !showFeedback) {
      setShowFeedback(true);
      setResultsShownTimestamp(Date.now());

      // Play sound based on correct/incorrect answer
      const correctSound = new Audio('/sounds/correct.mp3');
      const incorrectSound = new Audio('/sounds/incorrect.mp3');

      if (selectedAnswer === currentQuestion?.correct.answer) {
        correctSound.play();
        toast.success('Correct answer!', { icon: '✅' });
      } else if (selectedAnswer) {
        incorrectSound.play();
        toast.error('Incorrect answer!', { icon: '❌' });
      }
    } else if (!isResults && showFeedback) {
      // This means we've transitioned from results back to the question state
      console.log('Transitioning from results back to question state');
      setShowFeedback(false);
      setResultsShownTimestamp(null);

      console.log('Waiting for server to activate next question...');

      // Check if we have no active questions (potentially end of game)
      if (!questions.some((q) => q.isActive)) {
        console.log('No active questions found - need server update');

        // Let's proactively fix the issue by activating what should be the next question
        const lastAnsweredIndex = questions.findIndex(
          (q) => q.users && q.users.length > 0
        );

        if (
          lastAnsweredIndex >= 0 &&
          lastAnsweredIndex < questions.length - 1
        ) {
          console.log(
            'Found last answered question at index:',
            lastAnsweredIndex
          );
          console.log(
            'Trying to activate next question at index:',
            lastAnsweredIndex + 1
          );

          // If there was a previous question with answers, activate the next one
          const fixedQuestions = [...questions];
          fixedQuestions.forEach((q, i) => {
            q.isActive = i === lastAnsweredIndex + 1;
          });

          // This assumes there's an external update mechanism
          // We need a way to notify parent component
          if (forceNextQuestion) {
            forceNextQuestion();
          }
        } else if (questions.length > 0) {
          // If we can't find a last answered question, just activate the first one
          console.log(
            'No answered questions found, trying to activate first question'
          );
          const fixedQuestions = [...questions];
          fixedQuestions[0].isActive = true;

          if (forceNextQuestion) {
            forceNextQuestion();
          }
        }

        // Set a short timeout for emergency recovery
        const recoveryTimer = setTimeout(() => {
          if (!questions.some((q) => q.isActive) && forceNextQuestion) {
            console.log(
              'EMERGENCY: Still no active question after fix attempt'
            );
            forceNextQuestion();
          }
        }, 1000);

        return () => clearTimeout(recoveryTimer);
      }
    }
  }, [
    isResults,
    showFeedback,
    selectedAnswer,
    currentQuestion,
    questions,
    forceNextQuestion,
    advanceToNextQuestion,
  ]);

  // Apply the callback effect
  useEffect(() => {
    handleResultsChange();
  }, [handleResultsChange]);

  // Reset state when active question changes - optimized
  useEffect(() => {
    if (!currentQuestion) return;

    if (
      !initRef.current ||
      initRef.current.question !== currentQuestion.question
    ) {
      console.log(
        'Resetting state for new question:',
        currentQuestion.question
      );
      initRef.current = currentQuestion;
      setHasSubmitted(false);
      setSelectedAnswer('');
      setShowFeedback(false);
      setResultsShownTimestamp(null);
      toast.success('New question!', { icon: '❓' });
    }
  }, [currentQuestion?.question]); // Only depend on question text, not entire object

  // Timer tick sound effect
  useEffect(() => {
    const tickSound = new Audio('/sounds/tick.mp3');

    if (timeLeft <= 5 && timeLeft > 0 && !hasSubmitted) {
      tickSound.play();
    }
  }, [timeLeft, hasSubmitted]);

  if (!currentQuestion) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading question...</p>
      </div>
    );
  }

  const { question, createdAt, answers, correct, imagePath } = currentQuestion;

  // Debug the structure of answers
  console.log('Question answers:', answers);

  const handleSubmit = (e: { preventDefault: () => void; target: any }) => {
    e.preventDefault();

    // Get the selected radio button
    const radioInput = e.target.querySelector('input[type="radio"]:checked');

    if (!radioInput) {
      toast.error('Please select an answer first!');
      return;
    }

    const answer = radioInput.value;

    console.log('Submitting answer', { createdAt, answer });
    sendAnswerToServer(createdAt, answer);
    setHasSubmitted(true);
    toast.success('Answer submitted!');
  };

  const correctAnswer = correct.answer;

  return (
    <AnimatePresence mode="wait">
      <motion.form
        className={styles.card}
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        data-testid={isResults ? 'question-results' : 'question-form'}
      >
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{question}</h2>

          {!isResults && !hasSubmitted && (
            <div className={styles.timerContainer}>
              <CountdownCircleTimer
                isPlaying
                duration={30}
                colors={['#3b82f6', '#F7B801', '#A30000']}
                colorsTime={[30, 15, 5]}
                size={50}
                strokeWidth={6}
                onComplete={() => {
                  if (!hasSubmitted) {
                    toast.error("Time's up!");
                  }
                  return { shouldRepeat: false };
                }}
                onUpdate={(remainingTime) => setTimeLeft(remainingTime)}
              >
                {({ remainingTime }) => remainingTime}
              </CountdownCircleTimer>
            </div>
          )}
        </div>

        <div className={styles.cardContent}>
          {imagePath && (
            <div className={styles.imageContainer}>
              <motion.img
                src={imagePath}
                alt="Quiz question image"
                className={styles.gamePhoto}
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          <RadioGroup.Root
            onValueChange={setSelectedAnswer}
            className={styles.radioGroup}
            disabled={hasSubmitted || isResults}
          >
            {Array.isArray(answers) &&
              answers.map((answerItem, index) => {
                // Handle both string and object formats
                const answerText =
                  typeof answerItem === 'string'
                    ? answerItem
                    : answerItem &&
                      typeof answerItem === 'object' &&
                      'answer' in answerItem
                    ? answerItem.answer
                    : `Answer ${index}`;

                return (
                  <motion.div
                    key={index}
                    className={styles.radioItem}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    <RadioGroup.Item
                      value={answerText}
                      id={`answer-${index}`}
                      className={styles.radioGroupItem}
                    >
                      <RadioGroup.Indicator
                        className={styles.radioGroupIndicator}
                      />
                    </RadioGroup.Item>
                    <Label.Root
                      htmlFor={`answer-${index}`}
                      className={`${styles.label} ${
                        isResults
                          ? answerText === correctAnswer
                            ? styles.correct
                            : answerText === selectedAnswer
                            ? styles.incorrect
                            : styles.disabled
                          : ''
                      }`}
                    >
                      {answerText}

                      {isResults && answerText === correctAnswer && (
                        <motion.span
                          className={styles.correctIcon}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            damping: 10,
                            type: 'spring',
                            stiffness: 300,
                          }}
                        >
                          ✅
                        </motion.span>
                      )}

                      {isResults &&
                        answerText === selectedAnswer &&
                        answerText !== correctAnswer && (
                          <motion.span
                            className={styles.incorrectIcon}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 300,
                              damping: 10,
                            }}
                          >
                            ❌
                          </motion.span>
                        )}
                    </Label.Root>
                  </motion.div>
                );
              })}
          </RadioGroup.Root>

          <div className={styles.cardFooter}>
            {!isResults && (
              <motion.button
                type="submit"
                disabled={!selectedAnswer || hasSubmitted}
                className={styles.submitButton}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                {hasSubmitted ? 'Submitted' : 'Submit Answer'}
              </motion.button>
            )}
          </div>

          {hasSubmitted &&
            !isResults &&
            initRef.current?.question === currentQuestion?.question && (
              <div className={styles.cardWaiting}>
                <p>
                  Your answer has been submitted, waiting for other players!
                </p>
                <div className={styles.pulsingDot}></div>
              </div>
            )}

          {isResults && (
            <div
              className={styles.resultsContainer}
              data-testid="results-container"
            >
              <h3>Results</h3>
              <p>The correct answer was: {correctAnswer}</p>
              <Progress value={100} size="3" />

              {/* Show different buttons based on whether this is the last question */}
              {isAdmin &&
                (isLastQuestion() ? (
                  <Button
                    size="3"
                    color="blue"
                    onClick={triggerGameEnd}
                    style={{
                      marginTop: '15px',
                      fontWeight: 'bold',
                      animation: 'pulse 2s infinite',
                    }}
                  >
                    View Final Results →
                  </Button>
                ) : (
                  <Button
                    size="3"
                    color="green"
                    onClick={advanceToNextQuestion}
                    style={{
                      marginTop: '15px',
                      fontWeight: 'bold',
                      animation: 'pulse 2s infinite',
                    }}
                  >
                    Next Question →
                  </Button>
                ))}

              {/* Keep emergency button as fallback, but not on last question */}
              {resultsShownTimestamp &&
                Date.now() - resultsShownTimestamp > 8000 &&
                forceNextQuestion &&
                !isLastQuestion() && (
                  <Button
                    size="2"
                    color="red"
                    onClick={advanceToNextQuestion}
                    style={{ marginTop: '10px' }}
                  >
                    Stuck? Click to Continue
                  </Button>
                )}
            </div>
          )}
        </div>
      </motion.form>
    </AnimatePresence>
  );
}

// Optimize the memo comparison to prevent unnecessary rerenders
export default memo(GameComponent, (prevProps, nextProps) => {
  // Only rerender if any of these important props change
  const prevActiveQ = prevProps.questions.find((q) => q.isActive);
  const nextActiveQ = nextProps.questions.find((q) => q.isActive);

  const shouldSkipRender =
    // Same results state
    prevProps.isResults === nextProps.isResults &&
    // Same active question ID and content
    prevActiveQ?.createdAt === nextActiveQ?.createdAt &&
    prevActiveQ?.question === nextActiveQ?.question;

  // Log only when we're going to rerender
  if (!shouldSkipRender) {
    console.log('Game will rerender due to prop changes');
  }

  return shouldSkipRender;
});
