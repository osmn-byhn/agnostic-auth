import { EmailProvider } from "../../interfaces/CommunicationInterfaces";

export interface ResendConfig {
    apiKey: string;
    from: string;
}

export class ResendProvider implements EmailProvider {
    constructor(private config: ResendConfig) { }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: this.config.from,
                to: to,
                subject: subject,
                html: body,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Resend error: ${JSON.stringify(error)}`);
        }
    }
}
