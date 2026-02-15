import { AuthAdapter } from "../interfaces/AuthAdapter";
import { User } from "../entities/User";

export class TypeORMAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private repository: any) { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.repository.findOne({ where });
    }

    async create(data: Omit<TUser, "id">): Promise<TUser> {
        const user = this.repository.create(data);
        return this.repository.save(user);
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        await this.repository.update(id, data);
        return this.repository.findOne({ where: { id } });
    }

    metadata = {
        name: "TypeORM Adapter",
        type: "mysql" as const // Could be polyfilled or dynamic
    };
}
