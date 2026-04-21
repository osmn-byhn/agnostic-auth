import { StorageAdapter, OtpData } from "../interfaces/CommunicationInterfaces";

export class MemoryStorageAdapter implements StorageAdapter {
    private storage = new Map<string, OtpData>();

    async set(key: string, data: OtpData): Promise<void> {
        this.storage.set(key, data);
    }

    async get(key: string): Promise<OtpData | null> {
        const data = this.storage.get(key);
        if (!data) return null;

        if (new Date() > data.expiresAt) {
            this.storage.delete(key);
            return null;
        }

        return data;
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }
}
