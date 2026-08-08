import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EsignReminderProps {
  recipientName: string;
  documentTitle: string;
  url: string;
}

export const EsignReminder = ({
  recipientName = '{{recipientName}}',
  documentTitle = '{{documentTitle}}',
  url = '{{url}}',
}: EsignReminderProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reminder: signature still pending on {documentTitle}</Preview>
      <Tailwind>
        <Body className="bg-[#f4f4f7] font-sans">
          <Container className="bg-white max-w-xl mx-auto p-6 rounded-lg">
            <Text className="text-xl font-semibold mb-4">
              Hi {recipientName},
            </Text>
            <Text className="text-base mb-2">
              This is a reminder that your signature is still required on{' '}
              <strong>{documentTitle}</strong>.
            </Text>
            <Button
              href={url}
              className="bg-blue-600 text-white font-bold py-3 px-5 rounded-md no-underline inline-block mb-4"
            >
              Sign now
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EsignReminder;
