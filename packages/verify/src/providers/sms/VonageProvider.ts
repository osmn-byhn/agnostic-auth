import { SmsProvider } from "../../interfaces/CommunicationInterfaces";

export interface VonageConfig {
    apiKey: string;
    apiSecret: string;
    from: string;
}

export class VonageProvider implements SmsProvider {
    constructor(private config: VonageConfig) { }

    async sendSms(to: string, message: string): Promise<void> {
        const response = await fetch("https://rest.nexmo.com/sms/json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: this.config.apiKey,
                api_secret: this.config.apiSecret,
                to: to,
                from: this.config.from,
                text: message,
            }),
        });

        const data = await response.json();
        if (data.messages[0].status !== "0") {
            throw new Error(`Vonage error: ${data.messages[0]["error-text"]}`);
        }
    }
}
