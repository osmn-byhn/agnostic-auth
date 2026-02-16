import { User } from "../entities/User";
import { Session } from "../entities/Session";
import { AuthAdapter } from "../interfaces/AuthAdapter";

export class MemoryAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    private users: TUser[] = [];

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.users.find(user => {
            return Object.entries(where).every(([key, value]) => (user as any)[key] === value);
        }) || null;
    }

    async create(data: Omit<TUser, "id" | "isTwoFactorEnabled" | "failedLoginAttempts">): Promise<TUser> {
        const newUser = {
            ...data,
            id: Math.random().toString(36).substring(2, 9),
            isTwoFactorEnabled: false,
            failedLoginAttempts: 0,
        } as TUser;
        this.users.push(newUser);
        return newUser;
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) throw new Error("User not found");
        this.users[index] = { ...this.users[index], ...data };
        return this.users[index];
    }

    metadata = {
        name: "Memory Adapter",
        type: "memory" as const
    };

    private sessions: Session[] = [];

    async createSession(data: Omit<Session, "id">): Promise<Session> {
        const session = {
            ...data,
            id: Math.random().toString(36).substring(2, 15),
        } as Session;
        this.sessions.push(session);
        return session;
    }

    async findSession(where: { [key: string]: any }): Promise<Session | null> {
        return this.sessions.find(s => {
            return Object.entries(where).every(([key, value]) => (s as any)[key] === value);
        }) || null;
    }

    async updateSession(id: string, data: Partial<Session>): Promise<Session> {
        const index = this.sessions.findIndex(s => s.id === id);
        if (index === -1) throw new Error("Session not found");
        this.sessions[index] = { ...this.sessions[index], ...data };
        return this.sessions[index];
    }

    async deleteSession(id: string): Promise<void> {
        this.sessions = this.sessions.filter(s => s.id !== id);
    }

    async deleteAllUserSessions(userId: string): Promise<void> {
        this.sessions = this.sessions.filter(s => s.userId !== userId);
    }

    async findUserSessions(userId: string): Promise<Session[]> {
        return this.sessions.filter(s => s.userId === userId);
    }
}
