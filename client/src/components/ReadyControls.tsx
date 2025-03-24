import { Button, Flex, Text } from '@radix-ui/themes';
import React, { useEffect, useState } from 'react';
import styles from './readyControls.module.scss';

interface ReadyControlsProps {
  isAdmin: boolean;
  isReady: boolean;
  onSetReady: (ready: boolean) => void;
  onNextQuestion: () => void;
  allClientsReady: boolean;
}

const ReadyControls: React.FC<ReadyControlsProps> = ({
  isAdmin,
  isReady,
  onSetReady,
  onNextQuestion,
  allClientsReady,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Add debugging for component render
  console.log('ReadyControls rendering', {
    isAdmin,
    isReady,
    allClientsReady,
  });

  // Log when all clients are ready
  useEffect(() => {
    if (allClientsReady) {
      console.log('All clients are ready, admin can proceed');
    }
  }, [allClientsReady]);

  const handleNextQuestion = () => {
    console.log('Next question button clicked');
    setIsLoading(true);

    // Add timestamp to track time
    const clickTime = Date.now();

    // Call the next question function
    onNextQuestion();

    // Check state quickly
    setTimeout(() => {
      console.log(
        `Time elapsed since click: ${(Date.now() - clickTime) / 1000}s`
      );

      // If still loading after 2 seconds, try again
      if (isLoading) {
        console.log('Still loading after 2s - trying again');
        onNextQuestion();

        // Reset loading and show refresh option after another 3 seconds
        setTimeout(() => {
          if (isLoading) {
            console.log('Still loading after 5s total - offering refresh');
            setIsLoading(false);

            // Look for results container directly
            const resultsContainer = document.querySelector(
              '[data-testid="results-container"]'
            );
            if (resultsContainer) {
              console.log(
                'Results container still present - transition may be stuck'
              );
              if (
                confirm(
                  "Seems we're having trouble proceeding. Refresh the page?"
                )
              ) {
                window.location.reload();
              }
            }
          }
        }, 3000);
      }
    }, 2000);
  };

  return (
    <Flex
      direction="column"
      gap="3"
      style={{
        padding: '20px',
        background: 'rgba(248, 249, 250, 0.95)',
        borderRadius: '8px',
        marginTop: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: '2px solid #e9ecef',
        position: 'relative',
        zIndex: 100,
      }}
    >
      <Text size="5" weight="bold" style={{ color: '#495057' }}>
        Results
      </Text>

      {isAdmin ? (
        <>
          <Text style={{ color: allClientsReady ? '#28a745' : '#6c757d' }}>
            {allClientsReady
              ? '✅ All players are ready! You can proceed to the next question.'
              : '⌛ Waiting for all players to mark themselves as ready...'}
          </Text>
          <Button
            size="3"
            color="green"
            onClick={handleNextQuestion}
            disabled={!allClientsReady || isLoading}
            style={{
              marginTop: '10px',
              position: 'relative',
              overflow: 'hidden',
              fontWeight: 'bold',
            }}
          >
            {isLoading ? 'Processing...' : 'Next Question →'}
            {isLoading && (
              <div className={styles.buttonLoader}>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            )}
          </Button>

          {/* Only show the manual refresh after a delay */}
          {isLoading && (
            <Button
              size="2"
              color="gray"
              onClick={() => window.location.reload()}
              style={{
                marginTop: '5px',
                animation: 'fadeIn 0.5s ease-in 3s forwards',
                opacity: 0,
              }}
            >
              Manual Refresh
            </Button>
          )}
        </>
      ) : (
        <>
          <Text style={{ color: isReady ? '#28a745' : '#6c757d' }}>
            {isReady
              ? '✅ You are ready. Waiting for other players and the admin to proceed...'
              : '⌛ Please mark yourself as ready when you have reviewed the results.'}
          </Text>
          <Button
            color={isReady ? 'gray' : 'green'}
            size="3"
            onClick={() => onSetReady(!isReady)}
            style={{ marginTop: '10px' }}
          >
            {isReady ? "I'm Not Ready" : "I'm Ready"}
          </Button>
        </>
      )}
    </Flex>
  );
};

export default ReadyControls;
