import { OtpRepository } from "../interfaces/CommunicationInterfaces";

export class MemoryOtpRepository implements OtpRepository {
    private otps = new Map<string, { code: string; expiresAt: Date }>();

    async save(identifier: string, code: string, expiresAt: Date): Promise<void> {
        this.otps.set(identifier, { code, expiresAt });
    }

    async verify(identifier: string, code: string): Promise<boolean> {
        const data = this.otps.get(identifier);
        if (!data) return false;
        if (new Date() > data.expiresAt) {
            this.otps.delete(identifier);
            return false;
        }
        const isValid = data.code === code;
        if (isValid) {
            this.otps.delete(identifier); // One-time use
        }
        return isValid;
    }

    async delete(identifier: string): Promise<void> {
        this.otps.delete(identifier);
    }
}
