import { User } from "../entities/User";
import { Session } from "../entities/Session";
import { AuthAdapter } from "../interfaces/AuthAdapter";

export class MongooseAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private model: any) { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.model.findOne(where).lean();
    }

    async create(data: Omit<TUser, "id" | "isTwoFactorEnabled" | "failedLoginAttempts">): Promise<TUser> {
        const user = await this.model.create({
            ...data,
            isTwoFactorEnabled: false,
            failedLoginAttempts: 0
        });
        const obj = user.toObject();
        obj.id = obj._id.toString();
        return obj;
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        return this.model.findByIdAndUpdate(id, data, { new: true }).lean();
    }

    metadata = {
        name: "Mongoose Adapter",
        type: "mongodb" as const
    };

    async createSession(data: Omit<Session, "id">): Promise<Session> {
        throw new Error("Session management not implemented for Mongoose yet");
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
