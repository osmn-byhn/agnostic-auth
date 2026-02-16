import { User } from "../entities/User";
import { Session } from "../entities/Session";

export interface AuthAdapter<TUser = User> {
    // User methods
    findUnique(where: { [key: string]: any }): Promise<TUser | null>;
    create(data: Omit<TUser, "id" | "isTwoFactorEnabled" | "failedLoginAttempts">): Promise<TUser>;
    update(id: string, data: Partial<TUser>): Promise<TUser>;

    // Session methods
    createSession(data: Omit<Session, "id">): Promise<Session>;
    findSession(where: { [key: string]: any }): Promise<Session | null>;
    updateSession(id: string, data: Partial<Session>): Promise<Session>;
    deleteSession(id: string): Promise<void>;
    deleteAllUserSessions(userId: string): Promise<void>;
    findUserSessions(userId: string): Promise<Session[]>;

    metadata?: {
        name: string;
        type: "mongodb" | "postgresql" | "mysql" | "sqlite" | "memory";
    };
}
