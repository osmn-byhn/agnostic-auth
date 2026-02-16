import { AuthAdapter } from "../interfaces/AuthAdapter";
import { PasswordHasher, TokenBlacklist } from "../interfaces/AuthStrategies";
import { InvalidCredentialsError, TokenExpiredError, UnauthorizedError } from "../errors/AuthErrors";
import { OtpRepository, SmsProvider, EmailProvider } from "../interfaces/CommunicationInterfaces";
import { randomBytes } from "crypto";

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
        private smsProvider?: SmsProvider,
        private otpRepo?: OtpRepository
    ) { }

    async execute(identity: { [key: string]: any }, method: "email" | "sms" = "email") {
        const user = await this.adapter.findUnique(identity); // Uses identity object directly
        if (!user) return null;

        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await this.adapter.update(user.id, {
            resetPasswordToken: token,
            resetPasswordExpires: expiresAt
        } as any);

        if (method === "email" && this.emailProvider) {
            await this.emailProvider.sendEmail(
                (user as any).email,
                "Password Reset",
                `Use this link: /reset-password?token=${token}`
            );
        } else if (method === "sms" && this.smsProvider && this.otpRepo && user.phoneNumber) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await this.otpRepo.save(user.phoneNumber, code, expiresAt);
            await this.smsProvider.sendSms(user.phoneNumber, `Your password reset code: ${code}`);
            return code;
        }

        return token;
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
