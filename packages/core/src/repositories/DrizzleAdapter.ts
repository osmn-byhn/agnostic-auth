import { AuthAdapter } from "../interfaces/AuthAdapter";
import { User } from "../entities/User";

export class DrizzleAdapter<TUser extends User = User> implements AuthAdapter<TUser> {
    constructor(private db: any, private table: any) { }

    async findUnique(where: { [key: string]: any }): Promise<TUser | null> {
        const { eq } = require("drizzle-orm");
        const key = Object.keys(where)[0];
        const value = where[key];
        const results = await this.db.select().from(this.table).where(eq(this.table[key], value)).limit(1);
        return (results[0] as TUser) || null;
    }

    async create(data: Omit<TUser, "id">): Promise<TUser> {
        const results = await this.db.insert(this.table).values(data).returning();
        return results[0] as TUser;
    }

    async update(id: string, data: Partial<TUser>): Promise<TUser> {
        const { eq } = require("drizzle-orm");
        const results = await this.db.update(this.table).set(data).where(eq(this.table.id, id)).returning();
        return results[0] as TUser;
    }

    metadata = {
        name: "Drizzle Adapter",
        type: "postgresql" as const
    };
}
