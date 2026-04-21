import { SmsProvider } from "../../interfaces/CommunicationInterfaces";

export interface NetGsmConfig {
    userCode: string;
    password: string;
    msgHeader: string;
}

export class NetGsmProvider implements SmsProvider {
    constructor(private config: NetGsmConfig) { }

    async sendSms(to: string, message: string): Promise<void> {
        const response = await fetch("https://api.netgsm.com.tr/sms/send/get", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                usercode: this.config.userCode,
                password: this.config.password,
                gsmno: to.replace("+", ""), // NetGSM usually expects numbers without +
                message: message,
                msgheader: this.config.msgHeader,
                dil: "TR"
            }),
        });

        const text = await response.text();
        if (!text.startsWith("00")) {
            throw new Error(`NetGsm error: ${text}`);
        }
    }
}
