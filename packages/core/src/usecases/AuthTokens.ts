import { TokenProvider } from "../interfaces/AuthStrategies";
import { SessionManager } from "./SecurityUseCases";

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export class GenerateAuthTokens {
    constructor(
        private tokenProvider: TokenProvider,
        private sessionManager: SessionManager,
        private config: { 
            accessTokenExpiresIn?: string; 
            refreshTokenExpiresIn?: string;
        } = {}
    ) {}

    async execute(userId: string, metadata: { ip?: string; userAgent?: string; fingerprint?: string } = {}): Promise<AuthTokens> {
        const accessToken = this.tokenProvider.sign(
            { userId }, 
            { expiresIn: this.config.accessTokenExpiresIn || "15m" }
        );
        
        const refreshToken = this.tokenProvider.sign(
            { userId }, 
            { expiresIn: this.config.refreshTokenExpiresIn || "7d" }
        );

        await this.sessionManager.createSession(
            userId,
            refreshToken,
            metadata.ip,
            metadata.userAgent,
            metadata.fingerprint
        );

        return { accessToken, refreshToken };
    }
}
