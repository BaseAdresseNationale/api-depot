import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { Email } from './mailer.types';

@Injectable()
export class MailerService {
  private transport: nodemailer.Transporter;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    if (
      !this.configService.get<string>('SMTP_HOST') &&
      this.configService.get<string>('production')
    ) {
      throw new Error('SMTP_HOST must be provided in production mode');
    }
    this.transport = this.configService.get<string>('SMTP_HOST')
      ? nodemailer.createTransport({
          host: this.configService.get<string>('SMTP_HOST'),
          port: this.configService.get<number>('SMTP_PORT') || 587,
          secure: this.configService.get<string>('SMTP_SECURE') === 'YES',
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          },
        })
      : nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true,
        });

    this.apiUrl = this.initApiUrl();
  }

  private initApiUrl() {
    if (process.env.API_DEPOT_URL) {
      return process.env.API_DEPOT_URL;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('API_DEPOT_URL must be defined in production mode');
    }

    return 'https://plateforme-bal.adresse.data.gouv.fr.local';
  }

  async sendMail(email: Email, recipients: string[]): Promise<void> {
    if (recipients.length === 0) {
      throw new Error('At least one recipient must be provided');
    }

    email.html = email.html.replace(/\$\$API_URL\$\$/g, this.apiUrl);
    const { text, html, subject } = email;
    const info = await this.transport.sendMail({
      text,
      html,
      subject,
      from: this.configService.get<string>('SMTP_FROM'),
      to: recipients,
      bcc: this.configService.get<string>('SMTP_BCC')
        ? this.configService.get<string>('SMTP_BCC').split(',')
        : undefined,
    });

    if (
      this.configService.get<string>('SHOW_EMAILS') === 'YES' &&
      this.transport.transporter.options.streamTransport
    ) {
      console.log('-----------------------');
      console.log(info.message.toString());
      console.log('-----------------------');
    }

    return info;
  }
}
