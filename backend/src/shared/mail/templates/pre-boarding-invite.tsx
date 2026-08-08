// PreBoardingInvite.tsx
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

interface PreBoardingInviteProps {
  email: string;
  workerName: string;
  url: string;
  expiresInDays: number;
}

export const PreBoardingInvite = ({
  email = '{{email}}',
  workerName = '{{workerName}}',
  url = '{{url}}',
  expiresInDays = 30,
}: PreBoardingInviteProps) => {
  return (
    <Html>
      <Head />
      <Preview>Complete your pre-boarding packet for Polaris</Preview>
      <Tailwind>
        <Body className="bg-[#f4f4f7] font-sans">
          <Container className="bg-white max-w-xl mx-auto p-6 rounded-lg">
            <Text className="text-xl font-semibold mb-4">Hi {workerName},</Text>
            <Text className="text-base mb-2">
              Welcome aboard! Before your first day, we need a few details
              from you to get your profile ready.
            </Text>
            <Text className="text-base mb-4">
              Click the button below to complete your pre-boarding packet:
            </Text>
            <Button
              href={url}
              className="bg-blue-600 text-white font-bold py-3 px-5 rounded-md no-underline inline-block mb-4"
            >
              Complete pre-boarding
            </Button>
            <Text className="text-base mt-4">
              This link is unique to you — please don't share it with anyone.
            </Text>
            <Text className="text-xs text-gray-500 text-center mt-6">
              This link will expire in {expiresInDays} days for security
              reasons. If you did not expect this email, contact your People
              Ops team.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PreBoardingInvite;
