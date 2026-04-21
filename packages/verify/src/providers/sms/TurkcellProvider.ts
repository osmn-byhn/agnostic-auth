import { SmsProvider } from "../../interfaces/CommunicationInterfaces";

export interface TurkcellConfig {
    username: string;
    password: string;
    header: string;
}

export class TurkcellProvider implements SmsProvider {
    constructor(private config: TurkcellConfig) { }

    async sendSms(to: string, message: string): Promise<void> {
        // Turkcell often uses XML/SOAP or a specific POST structure. 
        // This is a simplified representation of a typical Turkcell SMS API call.
        const response = await fetch("https://api.turkcell.com.tr/sms/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: this.config.username,
                password: this.config.password,
                header: this.config.header,
                gsm: to,
                msg: message
            }),
        });

        if (!response.ok) {
            throw new Error(`Turkcell error: ${response.statusText}`);
        }
    }
}
