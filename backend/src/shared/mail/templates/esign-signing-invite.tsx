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

interface EsignSigningInviteProps {
  recipientName: string;
  documentTitle: string;
  url: string;
  expiresAt: string;
}

export const EsignSigningInvite = ({
  recipientName = '{{recipientName}}',
  documentTitle = '{{documentTitle}}',
  url = '{{url}}',
  expiresAt = '{{expiresAt}}',
}: EsignSigningInviteProps) => {
  return (
    <Html>
      <Head />
      <Preview>Action required: sign {documentTitle}</Preview>
      <Tailwind>
        <Body className="bg-[#f4f4f7] font-sans">
          <Container className="bg-white max-w-xl mx-auto p-6 rounded-lg">
            <Text className="text-xl font-semibold mb-4">
              Hi {recipientName},
            </Text>
            <Text className="text-base mb-2">
              You have been asked to sign <strong>{documentTitle}</strong> in
              Polaris.
            </Text>
            <Text className="text-base mb-4">
              Click below to review and sign the document:
            </Text>
            <Button
              href={url}
              className="bg-blue-600 text-white font-bold py-3 px-5 rounded-md no-underline inline-block mb-4"
            >
              Review and sign
            </Button>
            <Text className="text-xs text-gray-500 text-center mt-6">
              This signing link expires on {expiresAt}. Do not forward this
              email — the link is unique to you.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default EsignSigningInvite;
