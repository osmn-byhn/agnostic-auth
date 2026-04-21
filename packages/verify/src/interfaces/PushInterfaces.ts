export interface PushMessage {
    target: string | string[]; // Device token or array of tokens
    title: string;
    body: string;
    data?: Record<string, string>;
}

export interface PushProvider {
    sendPush(message: PushMessage): Promise<void>;
}
