import { User } from "../entities/User";
import { Session } from "../entities/Session";
import { AuthAdapter } from "../interfaces/AuthAdapter";

export class PrismaAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private prisma: any, private modelName: string) { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.prisma[this.modelName].findUnique({ where });
    }

    async create(data: Omit<TUser, "id" | "isTwoFactorEnabled" | "failedLoginAttempts">): Promise<TUser> {
        return this.prisma[this.modelName].create({
            data: {
                ...data,
                isTwoFactorEnabled: false,
                failedLoginAttempts: 0
            }
        });
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        return this.prisma[this.modelName].update({
            where: { id },
            data
        });
    }

    metadata = {
        name: "Prisma Adapter",
        type: "postgresql" as const
    };

    async createSession(data: Omit<Session, "id">): Promise<Session> {
        // In a real app, this would use prisma.session.create
        throw new Error("Session management not implemented for generic Prisma adapter yet");
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

