import { AuthAdapter } from "../interfaces/AuthAdapter";
import { User } from "../entities/User";

export class PrismaAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private prisma: any, private modelName: string = "user") { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.prisma[this.modelName].findUnique({ where });
    }

    async create(data: Omit<TUser, "id">): Promise<TUser> {
        return this.prisma[this.modelName].create({ data });
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        return this.prisma[this.modelName].update({
            where: { id },
            data,
        });
    }

    metadata = {
        name: "Prisma Adapter",
        type: "postgresql" as const // Could be dynamic based on prisma provider
    };
}
