import { EmailProvider } from "../../interfaces/CommunicationInterfaces";

export interface SendGridConfig {
    apiKey: string;
    from: string;
    fromName?: string;
}

export class SendGridProvider implements EmailProvider {
    constructor(private config: SendGridConfig) { }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: this.config.from, name: this.config.fromName },
                subject: subject,
                content: [{ type: "text/html", value: body }],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SendGrid error: ${JSON.stringify(error)}`);
        }
    }

    async sendBulkEmail(emails: Array<{ to: string; subject: string; body: string }>): Promise<void> {
        // SendGrid supports multiple personalizations in one request
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                personalizations: emails.map(email => ({
                    to: [{ email: email.to }],
                    subject: email.subject
                })),
                from: { email: this.config.from, name: this.config.fromName },
                content: [{ type: "text/html", value: emails[0].body }] // SendGrid bulk usually assumes same content but different personalizations
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SendGrid bulk error: ${JSON.stringify(error)}`);
        }
    }
}
