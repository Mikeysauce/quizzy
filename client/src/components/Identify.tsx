import * as Form from '@radix-ui/react-form';
import { Button, Heading } from '@radix-ui/themes';
import { useState } from 'react';

interface IdentifyProps {
  onSubmit: (name: string) => void;
}

function Identify({ onSubmit }: IdentifyProps) {
  const [name, setName] = useState('');

  return (
    <div className="containzer">
      <Heading size="9">Quiz App</Heading>
      <Form.Root className="FormRoot">
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
            />
          </Form.Control>
        </Form.Field>
        <Form.Submit asChild>
          <Button onClick={() => onSubmit(name)} style={{ marginTop: 10 }}>
            Submit
          </Button>
        </Form.Submit>
      </Form.Root>
    </div>
  );
}

export default Identify;
