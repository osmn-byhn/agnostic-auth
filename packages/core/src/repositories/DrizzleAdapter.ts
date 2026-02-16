import { User } from "../entities/User";
import { Session } from "../entities/Session";
import { AuthAdapter } from "../interfaces/AuthAdapter";

export class DrizzleAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private db: any, private table: any) { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        // Implementation for Drizzle...
        return null;
    }

    async create(data: Omit<TUser, "id" | "isTwoFactorEnabled" | "failedLoginAttempts">): Promise<TUser> {
        // Implementation for Drizzle...
        throw new Error("Not implemented");
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        // Implementation for Drizzle...
        throw new Error("Not implemented");
    }

    metadata = {
        name: "Drizzle Adapter",
        type: "sqlite" as const // Could be pg/mysql too
    };

    async createSession(data: Omit<Session, "id">): Promise<Session> {
        throw new Error("Not implemented");
    }

    async findSession(where: { [key: string]: any }): Promise<Session | null> {
        throw new Error("Not implemented");
    }

    async updateSession(id: string, data: Partial<Session>): Promise<Session> {
        throw new Error("Not implemented");
    }

    async deleteSession(id: string): Promise<void> {
        throw new Error("Not implemented");
    }

    async deleteAllUserSessions(userId: string): Promise<void> {
        throw new Error("Not implemented");
    }

    async findUserSessions(userId: string): Promise<Session[]> {
        throw new Error("Not implemented");
    }
}

