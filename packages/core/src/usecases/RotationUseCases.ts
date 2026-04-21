import { AuthAdapter } from "../interfaces/AuthAdapter";
import { TokenProvider } from "../interfaces/AuthStrategies";
import { UnauthorizedError } from "../errors/AuthErrors";
import { sha256 } from "../crypto";

export class RotateRefreshToken {
    constructor(
        private adapter: AuthAdapter,
        private tokenProvider: TokenProvider
    ) { }

    async execute(refreshToken: string, ip?: string, userAgent?: string, fingerprint?: string) {
        // 1. Hash the provided token for lookup
        const hashedInput = sha256(refreshToken);
        
        // 2. Find session with this refreshTokenHash
        const session = await this.adapter.findSession({ refreshTokenHash: hashedInput });

        if (!session || !session.isValid) {
            // Replay Attack detected! 
            if (session && !session.isValid) {
                // If we find a session with this token but it's invalid, it might mean it was already rotated (replay attack)
                await this.adapter.deleteAllUserSessions(session.userId);
                throw new UnauthorizedError("Security breach detected: Replay attack. All sessions revoked for safety.");
            }
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        // 3. Check expiration
        if (new Date() > session.expiresAt) {
            await this.adapter.updateSession(session.id, { isValid: false });
            throw new UnauthorizedError("Refresh token expired");
        }

        // 4. Detect suspicious activity (IP/Fingerprint change)
        if (session.ip && ip && session.ip !== ip) {
            console.warn(`Suspicious login detected for user ${session.userId}: IP changed from ${session.ip} to ${ip}`);
        }

        // 5. Rotate: Create new tokens and update session
        const newRefreshToken = this.tokenProvider.sign({ userId: session.userId }, { expiresIn: "7d" });
        const newAccessToken = this.tokenProvider.sign({ userId: session.userId }, { expiresIn: "15m" });

        // Hash the NEW refresh token before storing it
        await this.adapter.updateSession(session.id, {
            refreshTokenHash: sha256(newRefreshToken),
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

