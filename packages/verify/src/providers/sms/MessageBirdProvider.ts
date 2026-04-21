import { SmsProvider } from "../../interfaces/CommunicationInterfaces";

export interface MessageBirdConfig {
    apiKey: string;
    originator: string;
}

export class MessageBirdProvider implements SmsProvider {
    constructor(private config: MessageBirdConfig) { }

    async sendSms(to: string, message: string): Promise<void> {
        const response = await fetch("https://rest.messagebird.com/messages", {
            method: "POST",
            headers: {
                "Authorization": `AccessKey ${this.config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                recipients: [to],
                originator: this.config.originator,
                body: message,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`MessageBird error: ${JSON.stringify(error.errors)}`);
        }
    }
}
