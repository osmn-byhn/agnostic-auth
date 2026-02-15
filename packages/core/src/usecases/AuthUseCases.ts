import { AuthAdapter } from "../interfaces/AuthAdapter";
import { PasswordHasher, TokenBlacklist } from "../interfaces/AuthStrategies";
import { InvalidCredentialsError, TokenExpiredError, UnauthorizedError } from "../errors/AuthErrors";
import { randomBytes } from "crypto";

export class VerifyEmail {
    constructor(private adapter: AuthAdapter) { }

    async execute(token: string) {
        const user = await this.adapter.findUnique({ verificationToken: token });
        if (!user) throw new Error("Invalid or expired verification token");

        await this.adapter.update(user.id, { isVerified: true, verificationToken: undefined });
    }
}

export class ForgotPassword {
    constructor(private adapter: AuthAdapter) { }

    async execute(identity: { [key: string]: any }, identityField: string = "email") {
        const user = await this.adapter.findUnique({ [identityField]: identity[identityField] });
        if (!user) return null; // Silent failure for security

        const resetToken = randomBytes(32).toString("hex");
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        await this.adapter.update(user.id, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
        });

        return resetToken;
    }
}

export class ResetPassword {
    constructor(private adapter: AuthAdapter, private hasher: PasswordHasher) { }

    async execute(token: string, newPassword: string) {
        const user = await this.adapter.findUnique({ resetPasswordToken: token });

        if (!user || (user.resetPasswordExpires && user.resetPasswordExpires < new Date())) {
            throw new TokenExpiredError("Invalid or expired reset token");
        }

        const passwordHash = await this.hasher.hash(newPassword);

        await this.adapter.update(user.id, {
            passwordHash,
            resetPasswordToken: undefined,
            resetPasswordExpires: undefined,
            lockedUntil: undefined,
            failedLoginAttempts: 0,
        });
    }
}

export class Logout {
    constructor(private blacklist: TokenBlacklist) { }

    async execute(token: string, expiresAt: Date) {
        await this.blacklist.add(token, expiresAt);
    }
}

export class IsTokenBlacklisted {
    constructor(private blacklist: TokenBlacklist) { }

    async execute(token: string): Promise<boolean> {
        return this.blacklist.isBlacklisted(token);
    }
}
