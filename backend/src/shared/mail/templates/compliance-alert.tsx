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

interface ComplianceAlertProps {
  recipientName: string;
  alertTitle: string;
  dueDate: string;
  url: string;
}

export const ComplianceAlert = ({
  recipientName = '{{recipientName}}',
  alertTitle = '{{alertTitle}}',
  dueDate = '{{dueDate}}',
  url = '{{url}}',
}: ComplianceAlertProps) => {
  return (
    <Html>
      <Head />
      <Preview>Compliance alert: {alertTitle}</Preview>
      <Tailwind>
        <Body className="bg-[#f4f4f7] font-sans">
          <Container className="bg-white max-w-xl mx-auto p-6 rounded-lg">
            <Text className="text-xl font-semibold mb-4">
              Hi {recipientName},
            </Text>
            <Text className="text-base mb-2">
              <strong>{alertTitle}</strong> — due {dueDate}.
            </Text>
            <Button
              href={url}
              className="bg-blue-600 text-white font-bold py-3 px-5 rounded-md no-underline inline-block mb-4"
            >
              Review in People Ops dashboard
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ComplianceAlert;
