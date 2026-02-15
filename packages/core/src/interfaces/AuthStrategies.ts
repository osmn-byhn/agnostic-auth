export interface PasswordHasher {
    hash(password: string): Promise<string>;
    verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenProvider {
    sign(payload: any, options?: any): string;
    verify(token: string, options?: any): any;
    decode(token: string): any;
}

export interface TokenBlacklist {
    add(token: string, expiresAt: Date): Promise<void>;
    isBlacklisted(token: string): Promise<boolean>;
}
