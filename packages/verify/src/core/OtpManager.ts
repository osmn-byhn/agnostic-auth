import { StorageAdapter, OtpGenerator, Hasher, SmsProvider, EmailProvider, OtpData } from "../interfaces/CommunicationInterfaces";
import { PushProvider } from "../interfaces/PushInterfaces";
import { CommunicationService } from "./CommunicationService";
import { EmailTemplate, SmsTemplate, PushTemplate } from "../interfaces/TemplateInterfaces";

export interface OtpOptions {
    length?: number;
    ttlMinutes?: number;
    maxAttempts?: number;
    rateLimitSeconds?: number;
    smsTemplate?: string | SmsTemplate;
    emailTemplate?: string | EmailTemplate;
    pushTemplate?: string | PushTemplate;
    useAsync?: boolean;
}

export class OtpManager {
    constructor(
        private storage: StorageAdapter,
        private generator: OtpGenerator,
        private hasher: Hasher,
        private sms?: SmsProvider,
        private email?: EmailProvider,
        private push?: PushProvider,
        private communicationService?: CommunicationService
    ) { }

    async sendOtp(identifier: string, type: "sms" | "email" | "push", options: OtpOptions = {}) {
        const {
            length = 6,
            ttlMinutes = 5,
            rateLimitSeconds = 60
        } = options;

        const existing = await this.storage.get(identifier);

        if (existing && (new Date().getTime() - existing.lastSentAt.getTime()) < rateLimitSeconds * 1000) {
            throw new Error("Please wait before requesting another code");
        }

        const otp = this.generator.generate(length);
        const hash = await this.hasher.hash(otp);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await this.storage.set(identifier, {
            hash,
            expiresAt,
            attempts: 0,
            lastSentAt: new Date()
        });

        if (this.communicationService) {
            let template: any;
            if (type === "sms") {
                template = options.smsTemplate || { body: "Your code: {{code}}" };
            } else if (type === "email") {
                template = options.emailTemplate || { subject: "Your Authentication Code", body: "Your code: {{code}}" };
            } else {
                template = options.pushTemplate || { title: "Authentication Code", body: "Your code: {{code}}" };
            }
            await this.communicationService.sendTemplatedMessage(identifier, type, template, { code: otp }, options.useAsync);
        } else {
            if (type === "sms" && this.sms) {
                await this.sms.sendSms(identifier, `Your code: ${otp}`);
            } else if (type === "email" && this.email) {
                await this.email.sendEmail(identifier, "Your Authentication Code", `Your code: ${otp}`);
            } else if (type === "push" && this.push) {
                await this.push.sendPush({ target: identifier, title: "Authentication Code", body: `Your code: ${otp}` });
            }
        }

        return otp;
    }

    async verifyOtp(identifier: string, code: string, options: OtpOptions = {}) {
        const { maxAttempts = 5 } = options;

        const data = await this.storage.get(identifier);
        if (!data) return false;

        if (data.attempts >= maxAttempts) {
            await this.storage.delete(identifier);
            throw new Error("Too many failed attempts. Code invalidated.");
        }

        const isValid = await this.hasher.compare(code, data.hash);

        if (!isValid) {
            data.attempts += 1;
            await this.storage.set(identifier, data);
            return false;
        }

        await this.storage.delete(identifier);
        return true;
    }
}
