import * as Form from '@radix-ui/react-form';
import { Button, Heading, Text, Spinner } from '@radix-ui/themes';
import { useState } from 'react';

interface IdentifyProps {
  onSubmit: (name: string) => void;
  error?: string | null;
  isLoading?: boolean;
}

function Identify({ onSubmit, error, isLoading = false }: IdentifyProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isLoading) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="containzer">
      <Heading size="9">Quiz App</Heading>
      <Form.Root className="FormRoot" onSubmit={handleSubmit}>
        <Form.Field className="FormField" name="name">
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <Form.Label className="FormLabel">Name</Form.Label>
            <Form.Message className="FormMessage" match="valueMissing">
              Please enter your name
            </Form.Message>
          </div>
          <Form.Control asChild>
            <input
              className="Input"
              type="text"
              required
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </Form.Control>
        </Form.Field>

        {error && (
          <Text color="red" size="2" style={{ marginTop: '8px' }}>
            {error}
          </Text>
        )}

        <Form.Submit asChild>
          <Button type="submit" style={{ marginTop: 10 }} disabled={isLoading}>
            {isLoading ? (
              <span
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Spinner size="1" /> Connecting...
              </span>
            ) : (
              'Submit'
            )}
          </Button>
        </Form.Submit>
      </Form.Root>
    </div>
  );
}

export default Identify;
