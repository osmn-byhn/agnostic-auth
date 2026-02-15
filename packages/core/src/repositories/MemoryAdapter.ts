import { User } from "../entities/User";
import { AuthAdapter } from "../interfaces/AuthAdapter";

export class MemoryAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    private users: TUser[] = [];

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        return this.users.find(user => {
            return Object.entries(where).every(([key, value]) => (user as any)[key] === value);
        }) || null;
    }

    async create(data: Omit<TUser, "id">): Promise<TUser> {
        const newUser = {
            ...data,
            id: Math.random().toString(36).substring(2, 9),
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
}
