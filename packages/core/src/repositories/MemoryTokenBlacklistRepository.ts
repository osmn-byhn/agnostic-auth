import { TokenBlacklist } from "../interfaces/AuthStrategies";

export class MemoryTokenBlacklistRepository implements TokenBlacklist {
    private blacklist = new Map<string, number>();

    async add(token: string, expiresAt: Date): Promise<void> {
        this.blacklist.set(token, expiresAt.getTime());
    }

    async isBlacklisted(token: string): Promise<boolean> {
        const expiresAt = this.blacklist.get(token);
        if (!expiresAt) return false;

        if (Date.now() > expiresAt) {
            this.blacklist.delete(token);
            return false;
        }

        return true;
    }

    async cleanup(): Promise<void> {
        const now = Date.now();
        for (const [token, expiresAt] of this.blacklist.entries()) {
            if (now > expiresAt) {
                this.blacklist.delete(token);
            }
        }
    }
}
