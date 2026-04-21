import * as otplib from "otplib";
const { authenticator } = otplib as any;
import QRCode from "qrcode";
import { AuthAdapter } from "../interfaces/AuthAdapter";
import { Session } from "../entities/Session";
import { InvalidCredentialsError } from "../errors/AuthErrors";
import { sha256 } from "../crypto";

export class GenerateTOTPSecret {
    constructor(private adapter: AuthAdapter) { }

    async execute(userId: string, appName: string = "agauth") {
        const user = await this.adapter.findUnique({ id: userId });
        if (!user) throw new Error("User not found");

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.id, appName, secret);
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

        const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
        if (!isValid) throw new InvalidCredentialsError("Invalid 2FA code");

        if (!user.isTwoFactorEnabled) {
            await this.adapter.update(userId, { isTwoFactorEnabled: true });
        }

        return true;
    }
}

export class SessionManager {
    constructor(
        private adapter: AuthAdapter
    ) { }

    async createSession(userId: string, refreshToken: string, ip?: string, userAgent?: string, fingerprint?: string) {
        const refreshTokenHash = sha256(refreshToken);
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

    async getActiveSessions(userId: string) {
        const sessions = await this.adapter.findUserSessions(userId);
        const now = new Date();
        return sessions.filter(s => s.isValid && s.expiresAt > now);
    }

    async revokeOtherSessions(userId: string, currentSessionId: string) {
        const sessions = await this.getActiveSessions(userId);
        for (const session of sessions) {
            if (session.id !== currentSessionId) {
                await this.revokeSession(session.id);
            }
        }
    }

    async revokeSpecificSession(userId: string, sessionId: string) {
        const session = await this.adapter.findSession({ id: sessionId, userId });
        if (!session) throw new Error("Session not found or mapping forbidden");
        await this.revokeSession(sessionId);
    }
}

export class UnlockAccount {
    constructor(private adapter: AuthAdapter) { }

    async execute(token: string) {
        const user = await this.adapter.findUnique({ unlockToken: token });
        if (!user) throw new Error("Invalid or expired unlock token");

        await this.adapter.update(user.id, {
            lockedUntil: undefined,
            failedLoginAttempts: 0,
            unlockToken: undefined
        });

        return true;
    }
}

export class ManualLockAccount {
    constructor(private adapter: AuthAdapter) { }

    async execute(userId: string, hours: number = 24) {
        const expiresAt = new Date(Date.now() + hours * 3600000);
        await this.adapter.update(userId, { lockedUntil: expiresAt });
    }
}

export class ManualUnlockAccount {
    constructor(private adapter: AuthAdapter) { }

    async execute(userId: string) {
        await this.adapter.update(userId, {
            lockedUntil: undefined,
            failedLoginAttempts: 0,
            unlockToken: undefined
        });
    }
}

