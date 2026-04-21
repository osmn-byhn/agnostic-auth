import { SmsProvider } from "../../interfaces/CommunicationInterfaces";

export interface TwilioConfig {
    accountSid: string;
    authToken: string;
    from: string;
}

export class TwilioProvider implements SmsProvider {
    constructor(private config: TwilioConfig) { }

    async sendSms(to: string, message: string): Promise<void> {
        const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64");

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${auth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    To: to,
                    From: this.config.from,
                    Body: message,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Twilio error: ${error.message || response.statusText}`);
        }
    }
}
