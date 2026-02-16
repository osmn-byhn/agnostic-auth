export interface OtpRepository {
    save(identifier: string, code: string, expiresAt: Date): Promise<void>;
    verify(identifier: string, code: string): Promise<boolean>;
    delete(identifier: string): Promise<void>;
}

export interface SmsProvider {
    sendSms(to: string, message: string): Promise<void>;
}

export interface EmailProvider {
    sendEmail(to: string, subject: string, body: string): Promise<void>;
}
