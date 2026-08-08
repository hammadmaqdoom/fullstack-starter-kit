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

interface ReportExportReadyProps {
  recipientName: string;
  reportName: string;
  url: string;
}

export const ReportExportReady = ({
  recipientName = '{{recipientName}}',
  reportName = '{{reportName}}',
  url = '{{url}}',
}: ReportExportReadyProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your {reportName} export is ready</Preview>
      <Tailwind>
        <Body className="bg-[#f4f4f7] font-sans">
          <Container className="bg-white max-w-xl mx-auto p-6 rounded-lg">
            <Text className="text-xl font-semibold mb-4">
              Hi {recipientName},
            </Text>
            <Text className="text-base mb-2">
              Your scheduled <strong>{reportName}</strong> report has finished
              generating and is ready to download.
            </Text>
            <Button
              href={url}
              className="bg-blue-600 text-white font-bold py-3 px-5 rounded-md no-underline inline-block mb-4"
            >
              Download report
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReportExportReady;
