import { AuthAdapter } from "../interfaces/AuthAdapter";
import { PasswordHasher } from "../interfaces/AuthStrategies";
import { InvalidCredentialsError, AccountLockedError } from "../errors/AuthErrors";

export class Login {
  constructor(
    private adapter: AuthAdapter,
    private hasher: PasswordHasher,
    private config: { identityField?: string; lockAttempts?: number; lockTimeMinutes?: number } = {}
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

    const isPasswordValid = await this.hasher.verify(password, user.passwordHash);

    if (!isPasswordValid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = this.config.lockAttempts || 5;
      let updateData: any = { failedLoginAttempts: newAttempts };

      if (newAttempts >= maxAttempts) {
        const lockTime = this.config.lockTimeMinutes || 15;
        updateData.lockedUntil = new Date(Date.now() + lockTime * 60 * 1000);
      }

      await this.adapter.update(user.id, updateData);
      throw new InvalidCredentialsError();
    }

    // Success: Reset failed attempts and update metadata
    return this.adapter.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLoginIp: ip,
      lastLoginDevice: device,
    });
  }
}
