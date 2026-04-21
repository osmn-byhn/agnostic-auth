import { Hasher } from "../interfaces/CommunicationInterfaces";
import { createHash } from "crypto";

export class Sha256Hasher implements Hasher {
    async hash(data: string): Promise<string> {
        return createHash("sha256").update(data).digest("hex");
    }

    async compare(data: string, hash: string): Promise<boolean> {
        const hashed = await this.hash(data);
        return hashed === hash;
    }
}
