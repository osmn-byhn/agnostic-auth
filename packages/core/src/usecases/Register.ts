import { AuthAdapter } from "../interfaces/AuthAdapter";
import { PasswordHasher } from "../interfaces/AuthStrategies";
import { UserExistsError } from "../errors/AuthErrors";
import { randomBytes } from "crypto";
import { EmailProvider } from "@agauth/verify";

export class Register {
  constructor(
    private adapter: AuthAdapter,
    private hasher: PasswordHasher,
    private emailProvider?: EmailProvider,
    private config: { identityField?: string; verificationUrl?: string } = {}
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

    const user = await this.adapter.create({
      ...extraFields,
      [identityField]: identityValue,
      passwordHash,
      createdAt: new Date(),
      isEmailVerified: false,
      verificationToken,
      failedLoginAttempts: 0,
    } as any);

    if (this.emailProvider && user.verificationToken && identityValue.includes("@")) {
      const url = (this.config.verificationUrl || "/verify-email?token=") + user.verificationToken;
      await this.emailProvider.sendEmail(
        identityValue,
        "Verify your email",
        `Please click here to verify your email: ${url}`
      );
    }

    return user;
  }
}
