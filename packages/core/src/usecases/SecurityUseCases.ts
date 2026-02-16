import * as otplib from "otplib";
const { authenticator } = otplib as any;
import QRCode from "qrcode";
import { AuthAdapter } from "../interfaces/AuthAdapter";
import { Session } from "../entities/Session";
import { InvalidCredentialsError } from "../errors/AuthErrors";

export class GenerateTOTPSecret {
    constructor(private adapter: AuthAdapter) { }

    async execute(userId: string, appName: string = "agauth") {
        const user = await this.adapter.findUnique({ id: userId });
        if (!user) throw new Error("User not found");

        const secret = otplib.authenticator.generateSecret();
        const otpauth = otplib.authenticator.keyuri(user.id, appName, secret);
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        await this.adapter.update(userId, { twoFactorSecret: secret });

        return { secret, qrCodeUrl };
    }
}

export class VerifyTOTP {
    constructor(private adapter: AuthAdapter) { }

    async execute(userId: string, code: string) {
        const user = await this.adapter.findUnique({ id: userId });
        if (!user || !user.twoFactorSecret) throw new Error("2FA not configured");

        const isValid = otplib.authenticator.verify({ token: code, secret: user.twoFactorSecret });
        if (!isValid) throw new InvalidCredentialsError("Invalid 2FA code");

        if (!user.isTwoFactorEnabled) {
            await this.adapter.update(userId, { isTwoFactorEnabled: true });
        }

        return true;
    }
}

export class SessionManager {
    constructor(private adapter: AuthAdapter) { }

    async createSession(userId: string, refreshToken: string, ip?: string, userAgent?: string, fingerprint?: string) {
        const refreshTokenHash = refreshToken; // Replace with proper hash in production
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        return this.adapter.createSession({
            userId,
            refreshTokenHash,
            ip,
            userAgent,
            deviceFingerprint: fingerprint,
            createdAt: new Date(),
            expiresAt,
            isValid: true,
            lastActiveAt: new Date()
        });
    }

    async revokeSession(sessionId: string) {
        await this.adapter.updateSession(sessionId, { isValid: false });
    }

    async revokeAllUserSessions(userId: string) {
        await this.adapter.deleteAllUserSessions(userId);
    }
}

