import bcrypt from "bcryptjs";
import { PasswordHasher } from "../interfaces/AuthStrategies";

export class BcryptHasher implements PasswordHasher {
    constructor(private rounds: number = 10) { }

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.rounds);
    }

    async verify(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}
