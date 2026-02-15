import { User } from "../entities/User";

export interface AuthAdapter<TUser = User> {
    /**
     * Finds a user by a unique identifier (e.g., email, username, id).
     */
    findUnique(where: { [key: string]: any }): Promise<TUser | null>;

    /**
     * Creates a new user record.
     */
    create(data: Omit<TUser, "id">): Promise<TUser>;

    /**
     * Updates an existing user record.
     */
    update(id: string, data: Partial<TUser>): Promise<TUser>;

    /**
     * Optionally returns the database type or features supported.
     */
    metadata?: {
        name: string;
        type: "mongodb" | "postgresql" | "mysql" | "sqlite" | "memory";
    };
}
