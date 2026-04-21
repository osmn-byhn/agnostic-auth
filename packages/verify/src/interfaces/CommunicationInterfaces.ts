export interface OtpData {
    hash: string;
    expiresAt: Date;
    attempts: number;
    lastSentAt: Date;
}

export interface StorageAdapter {
    set(key: string, data: OtpData): Promise<void>;
    get(key: string): Promise<OtpData | null>;
    delete(key: string): Promise<void>;
}

export interface OtpGenerator {
    generate(length: number, options?: { numeric?: boolean; alphanumeric?: boolean }): string;
}

export interface Hasher {
    hash(data: string): Promise<string>;
    compare(data: string, hash: string): Promise<boolean>;
}

export interface SmsProvider {
    sendSms(to: string, message: string): Promise<void>;
}

export interface EmailProvider {
    sendEmail(to: string, subject: string, body: string): Promise<void>;
    sendBulkEmail?(emails: Array<{ to: string; subject: string; body: string }>): Promise<void>;
}

export interface Message {
    type: "sms" | "email" | "push";
    payload: {
        to: string | string[];
        subject?: string; // For Email
        title?: string;   // For Push
        body?: string;
        data?: Record<string, string>; // For Push data payload
        templateName?: string;
        rawTemplate?: {
            subject?: string;
            body: string;
        };
        variables?: Record<string, string | number>;
        recipients?: Array<{ to: string; variables: Record<string, string | number> }>;
    };
}

export interface MessageQueue {
    publish(message: Message): Promise<void>;
    consume(handler: (message: Message) => Promise<void>): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
