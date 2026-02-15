export interface TokenBlacklistRepository {
    add(token: string, expiresAt: Date): Promise<void>;
    isBlacklisted(token: string): Promise<boolean>;
    cleanup(): Promise<void>;
}
