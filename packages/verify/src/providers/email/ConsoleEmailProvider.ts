import { EmailProvider } from "../../interfaces/CommunicationInterfaces";

/**
 * Local development provider that logs emails to the console.
 */
export class ConsoleEmailProvider implements EmailProvider {
    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        console.log("--- [LOCAL EMAIL] ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);
        console.log("----------------------");
    }

    async sendBulkEmail(emails: Array<{ to: string; subject: string; body: string }>): Promise<void> {
        console.log(`--- [LOCAL BULK EMAIL] (${emails.length} recipients) ---`);
        for (const email of emails) {
            console.log(`>> To: ${email.to} | Subject: ${email.subject}`);
        }
        console.log("-------------------------------------------------------");
    }
}
