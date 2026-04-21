import { EmailProvider } from "../../interfaces/CommunicationInterfaces";

export type CustomEmailHandler = (to: string, subject: string, body: string) => Promise<void>;

/**
 * Universal provider allowing developers to implement custom logic inline.
 */
export class CustomEmailProvider implements EmailProvider {
    constructor(private handler: CustomEmailHandler) { }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        await this.handler(to, subject, body);
    }

    async sendBulkEmail(emails: Array<{ to: string; subject: string; body: string }>): Promise<void> {
        for (const email of emails) {
            await this.handler(email.to, email.subject, email.body);
        }
    }
}
