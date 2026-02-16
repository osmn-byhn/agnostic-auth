import { AuthAdapter } from "../interfaces/AuthAdapter";
import { TokenProvider } from "../interfaces/AuthStrategies";
import { UnauthorizedError } from "../errors/AuthErrors";

export class RotateRefreshToken {
    constructor(
        private adapter: AuthAdapter,
        private tokenProvider: TokenProvider
    ) { }

    async execute(refreshToken: string, ip?: string, userAgent?: string, fingerprint?: string) {
        // 1. Find session with this refreshTokenHash
        const session = await this.adapter.findSession({ refreshTokenHash: refreshToken });

        if (!session || !session.isValid) {
            // Replay Attack detected! 
            // If we find a session with this token but it's invalid, it might mean it was already rotated.
            if (session && !session.isValid) {
                // Potential compromise: Revoke all user sessions for safety
                await this.adapter.deleteAllUserSessions(session.userId);
                throw new UnauthorizedError("Security breach detected: Replay attack. All sessions revoked.");
            }
            throw new UnauthorizedError("Invalid refresh token");
        }

        // 2. Check expiration
        if (new Date() > session.expiresAt) {
            await this.adapter.updateSession(session.id, { isValid: false });
            throw new UnauthorizedError("Refresh token expired");
        }

        // 3. Detect suspicious activity (IP/Fingerprint change)
        if (session.ip && ip && session.ip !== ip) {
            // Log suspicious activity, maybe trigger additional check
            console.warn(`Suspicious login detected for user ${session.userId}: IP changed from ${session.ip} to ${ip}`);
        }

        // 4. Rotate: Create new token and update session
        const newRefreshToken = this.tokenProvider.sign({ userId: session.userId }, { expiresIn: "7d" });
        const newAccessToken = this.tokenProvider.sign({ userId: session.userId }, { expiresIn: "15m" });

        await this.adapter.updateSession(session.id, {
            refreshTokenHash: newRefreshToken, // Rotation
            lastActiveAt: new Date(),
            ip,
            userAgent,
            deviceFingerprint: fingerprint
        });

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }
}

export class SuspiciousLoginDetector {
    async analyze(userId: string, currentInfo: { ip: string, device: string }, lastInfo?: { ip: string, device: string }) {
        if (!lastInfo) return false;

        const results = [];
        if (currentInfo.ip !== lastInfo.ip) results.push("IP_CHANGE");
        if (currentInfo.device !== lastInfo.device) results.push("DEVICE_CHANGE");

        return results.length > 0 ? results : false;
    }
}

