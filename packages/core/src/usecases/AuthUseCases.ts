import { AuthAdapter } from "../interfaces/AuthAdapter";
import { PasswordHasher, TokenBlacklist } from "../interfaces/AuthStrategies";
import { InvalidCredentialsError, TokenExpiredError, UnauthorizedError } from "../errors/AuthErrors";
import { OtpManager, EmailProvider, PhoneNormalizer } from "@agauth/verify";
import { randomBytes } from "crypto";
import { sha256 } from "../crypto";

export class VerifyEmail {
    constructor(private adapter: AuthAdapter) { }

    async execute(token: string) {
        const user = await this.adapter.findUnique({ verificationToken: token });
        if (!user) throw new Error("Invalid or expired verification token");

        await this.adapter.update(user.id, { isEmailVerified: true, verificationToken: undefined } as any);
    }
}

export class ForgotPassword {
    constructor(
        private adapter: AuthAdapter,
        private emailProvider?: EmailProvider,
        private otpManager?: OtpManager,
        private config: { resetUrl?: string; expirationMinutes?: number } = {}
    ) { }

    async execute(identity: { [key: string]: any }, method: "email" | "sms" = "email") {
        const user = await this.adapter.findUnique(identity); // Uses identity object directly
        if (!user) return null;

        const token = randomBytes(32).toString("hex");
        const hashedToken = sha256(token);
        const expiration = this.config.expirationMinutes || 60;
        const expiresAt = new Date(Date.now() + expiration * 60000);

        await this.adapter.update(user.id, {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: expiresAt
        } as any);

        if (method === "email" && this.emailProvider) {
            const url = (this.config.resetUrl || "/reset-password?token=") + token;
            await this.emailProvider.sendEmail(
                (user as any).email,
                "Password Reset",
                `Please click here to reset your password: ${url}`
            );
        } else if (method === "sms" && this.otpManager && user.phoneNumber) {
            const normalizedPhone = PhoneNormalizer.normalize(user.phoneNumber);
            const code = await this.otpManager.sendOtp(normalizedPhone, "sms");
            return code;
        }

        return token;
    }
}

export class ResetPassword {
    constructor(private adapter: AuthAdapter, private hasher: PasswordHasher) { }

    async execute(token: string, newPassword: string) {
        const hashedToken = sha256(token);
        const user = await this.adapter.findUnique({ resetPasswordToken: hashedToken });

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

export class ResendVerificationEmail {
    constructor(
        private adapter: AuthAdapter,
        private emailProvider: EmailProvider,
        private config: { verificationUrl?: string } = {}
    ) { }

    async execute(identity: { [key: string]: any }) {
        const user = await this.adapter.findUnique(identity);
        if (!user) return;

        if ((user as any).isEmailVerified) {
            throw new Error("Email is already verified");
        }

        const verificationToken = randomBytes(32).toString("hex");
        await this.adapter.update(user.id, { verificationToken } as any);

        const email = (identity as any).email || (user as any).email;
        if (email && email.includes("@")) {
            const url = (this.config.verificationUrl || "/verify-email?token=") + verificationToken;
            await this.emailProvider.sendEmail(
                email,
                "Verify your email",
                `Please click here to verify your email: ${url}`
            );
        }
    }
}

export class ValidateResetToken {
    constructor(private adapter: AuthAdapter) { }

    async execute(token: string): Promise<boolean> {
        const hashedToken = sha256(token);
        const user = await this.adapter.findUnique({ resetPasswordToken: hashedToken });

        if (!user || (user.resetPasswordExpires && user.resetPasswordExpires < new Date())) {
            return false;
        }

        return true;
    }
}
