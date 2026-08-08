import { MailTemplate } from '@/constants/mail.constant';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmailVerificationMail({
    email,
    url,
  }: {
    email: string;
    url: string;
  }) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify your Email',
      template: MailTemplate.EmailVerification,
      context: {
        email: email,
        url,
      },
    });
  }

  async sendAuthMagicLinkMail({ email, url }: { email: string; url: string }) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Magic Link',
      template: MailTemplate.SignInMagicLink,
      context: {
        email: email,
        url,
      },
    });
  }

  async sendResetPasswordMail({ email, url }: { email: string; url: string }) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Password',
      template: MailTemplate.ResetPassword,
      context: {
        email: email,
        url,
      },
    });
  }

  async sendEsignSigningInviteMail({
    email,
    recipientName,
    documentTitle,
    url,
    expiresAt,
  }: {
    email: string;
    recipientName: string;
    documentTitle: string;
    url: string;
    expiresAt: string;
  }) {
    await this.mailerService.sendMail({
      to: email,
      subject: `Action required: sign ${documentTitle}`,
      template: MailTemplate.EsignSigningInvite,
      context: {
        email,
        recipientName,
        documentTitle,
        url,
        expiresAt,
      },
    });
  }

  async sendEsignReminderMail({
    email,
    recipientName,
    documentTitle,
    url,
  }: {
    email: string;
    recipientName: string;
    documentTitle: string;
    url: string;
  }) {
    await this.mailerService.sendMail({
      to: email,
      subject: `Reminder: signature pending on ${documentTitle}`,
      template: MailTemplate.EsignReminder,
      context: {
        email,
        recipientName,
        documentTitle,
        url,
      },
    });
  }

  async sendComplianceAlertMail({
    email,
    recipientName,
    alertTitle,
    dueDate,
    url,
  }: {
    email: string;
    recipientName: string;
    alertTitle: string;
    dueDate: string;
    url: string;
  }) {
    await this.mailerService.sendMail({
      to: email,
      subject: `Compliance alert: ${alertTitle}`,
      template: MailTemplate.ComplianceAlert,
      context: {
        email,
        recipientName,
        alertTitle,
        dueDate,
        url,
      },
    });
  }

  async sendReportExportReadyMail({
    email,
    recipientName,
    reportName,
    url,
  }: {
    email: string;
    recipientName: string;
    reportName: string;
    url: string;
  }) {
    await this.mailerService.sendMail({
      to: email,
      subject: `Your ${reportName} export is ready`,
      template: MailTemplate.ReportExportReady,
      context: {
        email,
        recipientName,
        reportName,
        url,
      },
    });
  }

  async sendPreBoardingInviteMail({
    email,
    workerName,
    url,
    expiresInDays,
  }: {
    email: string;
    workerName: string;
    url: string;
    expiresInDays: number;
  }) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to Polaris — complete your pre-boarding packet',
      template: MailTemplate.PreBoardingInvite,
      context: {
        email,
        workerName,
        url,
        expiresInDays,
      },
    });
  }
}
