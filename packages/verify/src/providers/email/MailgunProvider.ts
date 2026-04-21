import { EmailProvider } from "../../interfaces/CommunicationInterfaces";

export interface MailgunConfig {
    apiKey: string;
    domain: string;
    from: string;
    region?: "us" | "eu";
}

export class MailgunProvider implements EmailProvider {
    constructor(private config: MailgunConfig) { }

    private get apiUrl() {
        const base = this.config.region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
        return `https://${base}/v3/${this.config.domain}/messages`;
    }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        const auth = Buffer.from(`api:${this.config.apiKey}`).toString("base64");

        const response = await fetch(this.apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                from: this.config.from,
                to: to,
                subject: subject,
                html: body,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Mailgun error: ${error.message || response.statusText}`);
        }
    }
}
