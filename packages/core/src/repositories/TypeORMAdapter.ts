import { User } from "../entities/User";
import { Session } from "../entities/Session";
import { AuthAdapter } from "../interfaces/AuthAdapter";

export class TypeORMAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private repository: any) { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.repository.findOne({ where });
    }

    async create(data: Omit<TUser, "id" | "isTwoFactorEnabled" | "failedLoginAttempts">): Promise<TUser> {
        const user = this.repository.create({
            ...data,
            isTwoFactorEnabled: false,
            failedLoginAttempts: 0
        });
        return this.repository.save(user);
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        await this.repository.update(id, data);
        return this.findUnique({ id }) as Promise<TUser>;
    }

    metadata = {
        name: "TypeORM Adapter",
        type: "mysql" as const
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

