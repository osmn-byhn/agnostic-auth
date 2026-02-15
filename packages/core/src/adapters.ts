import { AuthAdapter } from "./interfaces/AuthAdapter";
import { MemoryAdapter } from "./repositories/MemoryAdapter";
import { PrismaAdapter } from "./repositories/PrismaAdapter";
import { MongooseAdapter } from "./repositories/MongooseAdapter";
import { DrizzleAdapter } from "./repositories/DrizzleAdapter";
import { TypeORMAdapter } from "./repositories/TypeORMAdapter";

export {
    MemoryAdapter,
    PrismaAdapter,
    MongooseAdapter,
    DrizzleAdapter,
    TypeORMAdapter
};

/**
 * Basic auto-detection logic based on environment variables.
 */
export async function detectAdapter(): Promise<AuthAdapter> {
    const dbUrl = process.env.DATABASE_URL || "";

    if (dbUrl.startsWith("mongodb")) {
        console.info("Detected MongoDB. You should use MongooseAdapter or PrismaAdapter(mongodb).");
    } else if (dbUrl.startsWith("postgres")) {
        console.info("Detected PostgreSQL. You should use PrismaAdapter, DrizzleAdapter, or TypeORMAdapter.");
    } else if (dbUrl.startsWith("mysql")) {
        console.info("Detected MySQL. You should use PrismaAdapter, DrizzleAdapter, or TypeORMAdapter.");
    } else if (dbUrl.includes(".db") || dbUrl.includes("sqlite")) {
        console.info("Detected SQLite. You should use PrismaAdapter, DrizzleAdapter, or TypeORMAdapter.");
    }

    // Default to MemoryAdapter for safety if nothing is configured
    return new MemoryAdapter();
}
