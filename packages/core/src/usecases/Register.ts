import { AuthAdapter } from "../interfaces/AuthAdapter";
import { PasswordHasher } from "../interfaces/AuthStrategies";
import { UserExistsError } from "../errors/AuthErrors";
import { randomBytes } from "crypto";

export class Register {
  constructor(
    private adapter: AuthAdapter,
    private hasher: PasswordHasher,
    private config: { identityField?: string } = {}
  ) { }

  async execute(credentials: { [key: string]: any }, password: string, extraFields: { [key: string]: any } = {}) {
    const identityField = this.config.identityField || "email";
    const identityValue = credentials[identityField];

    if (!identityValue || !password) {
      throw new Error(`${identityField} and password are required`);
    }

    const existingUser = await this.adapter.findUnique({ [identityField]: identityValue });
    if (existingUser) {
      throw new UserExistsError(`User with this ${identityField} already exists`);
    }

    const passwordHash = await this.hasher.hash(password);
    const verificationToken = randomBytes(32).toString("hex");

    return this.adapter.create({
      ...extraFields,
      [identityField]: identityValue,
      passwordHash,
      createdAt: new Date(),
      isVerified: false,
      verificationToken,
      failedLoginAttempts: 0,
    } as any);
  }
}
