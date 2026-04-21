import { EmailProvider } from "../../interfaces/CommunicationInterfaces";
import * as nodemailer from "nodemailer";

export interface SmtpConfig {
    host: string;
    port: number;
    secure?: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
}

/**
 * Functional SMTP Provider using nodemailer.
 */
export class SmtpProvider implements EmailProvider {
    private transporter: nodemailer.Transporter;

    constructor(private config: SmtpConfig) {
        this.transporter = nodemailer.createTransport({
            host: this.config.host,
            port: this.config.port,
            secure: this.config.secure,
            auth: this.config.auth,
        });
    }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        await this.transporter.sendMail({
            from: this.config.from,
            to,
            subject,
            html: body,
        });
    }

    async sendBulkEmail(emails: Array<{ to: string; subject: string; body: string }>): Promise<void> {
        // Nodemailer sends one by one if not using specific plugins, 
        // but we can wrap them in Promise.all or send sequentially.
        for (const email of emails) {
            await this.sendEmail(email.to, email.subject, email.body);
        }
    }
}
