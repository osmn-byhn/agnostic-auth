import { AuthAdapter } from "../interfaces/AuthAdapter";
import { PasswordHasher } from "../interfaces/AuthStrategies";
import { InvalidCredentialsError, AccountLockedError } from "../errors/AuthErrors";
import { EmailProvider } from "@agauth/verify";
import { randomBytes } from "crypto";

export class Login {
  constructor(
    private adapter: AuthAdapter,
    private hasher: PasswordHasher,
    private emailProvider?: EmailProvider,
    private config: {
      identityField?: string;
      lockAttempts?: number;
      lockTimeMinutes?: number;
      requireVerification?: boolean;
      unlockUrl?: string;
    } = {}
  ) { }

  async execute(credentials: { [key: string]: any }, password: string, ip?: string, device?: string) {
    const identityField = this.config.identityField || "email";
    const identityValue = credentials[identityField];

    if (!identityValue || !password) {
      throw new Error(`${identityField} and password are required`);
    }

    const user = await this.adapter.findUnique({ [identityField]: identityValue });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AccountLockedError(`Account is temporarily locked. Try again in ${remainingMinutes} minutes.`);
    }

    // Check if verification is required
    if (this.config.requireVerification && !user.isEmailVerified) {
      throw new Error("Please verify your email before logging in.");
    }

    const isPasswordValid = await this.hasher.verify(password, user.passwordHash);

    if (!isPasswordValid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = this.config.lockAttempts || 5;
      let updateData: any = { failedLoginAttempts: newAttempts };

      if (newAttempts >= maxAttempts) {
        const lockTime = this.config.lockTimeMinutes || 15;
        const unlockToken = randomBytes(32).toString("hex");

        updateData.lockedUntil = new Date(Date.now() + lockTime * 60 * 1000);
        updateData.unlockToken = unlockToken;

        const email = (user as any).email || (user as any).identity;
        if (this.emailProvider && email && email.includes("@")) {
          const url = (this.config.unlockUrl || "/unlock-account?token=") + unlockToken;
          await this.emailProvider.sendEmail(
            email,
            "Account Security Alert",
            `Your account has been locked due to too many failed login attempts. Use this link to unlock it: ${url}`
          );
        }
      }

      await this.adapter.update(user.id, updateData);
      throw new InvalidCredentialsError();
    }

    // Success: Reset failed attempts and update metadata
    return this.adapter.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      unlockToken: undefined,
      lastLoginIp: ip,
      lastLoginDevice: device,
    });
  }
}
