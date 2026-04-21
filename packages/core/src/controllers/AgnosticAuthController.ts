import { AuthRequest, AuthResponse } from "../interfaces/AgnosticHttp";
import { Login } from "../usecases/Login";
import { Register } from "../usecases/Register";
import { TokenProvider } from "../interfaces/AuthStrategies";
import { AuthError, UnauthorizedError, InvalidCredentialsError, TooManyRequestsError } from "../errors/AuthErrors";
import { Logout, VerifyEmail, ForgotPassword, ResetPassword, ResendVerificationEmail, ValidateResetToken } from "../usecases/AuthUseCases";
import { SessionManager, VerifyTOTP, GenerateTOTPSecret, UnlockAccount } from "../usecases/SecurityUseCases";
import { GenerateAuthTokens } from "../usecases/AuthTokens";
import { RotateRefreshToken } from "../usecases/RotationUseCases";
import { RateLimiter } from "../interfaces/RateLimiter";
import { sha256 } from "../crypto";

export class AgnosticAuthController {
    constructor(
        private register: Register,
        private login: Login,
        private verifyEmail: VerifyEmail,
        private resendVerification: ResendVerificationEmail,
        private forgotPassword: ForgotPassword,
        private resetPassword: ResetPassword,
        private validateResetToken: ValidateResetToken,
        private logout: Logout,
        private sessionManager: SessionManager,
        private verifyTOTP: VerifyTOTP,
        private generateTOTP: GenerateTOTPSecret,
        private unlockAccount: UnlockAccount,
        private rotateRefreshToken: RotateRefreshToken,
        private generateAuthTokens: GenerateAuthTokens,
        private rateLimiter: RateLimiter,
        private otpManager: any,
        private verifyOtp: any,
        private tokenProvider: TokenProvider,
        private config: {
            accessTokenSecret: string;
            refreshTokenSecret: string;
            isProduction?: boolean;
        }
    ) { }

    private async generateTokens(userId: string, req: AuthRequest) {
        return this.generateAuthTokens.execute(userId, {
            ip: req.ip,
            userAgent: req.userAgent,
            fingerprint: req.body.fingerprint
        });
    }

    async registerHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            await this.checkRateLimit(req, "register");
            const { password, extraFields, ...credentials } = req.body;
            const user = await this.register.execute(credentials, password, extraFields);

            return {
                status: 201,
                body: { user },
                cookies: [
                    {
                        name: "csrf-token",
                        value: "simple-csrf-token",
                        options: { httpOnly: true, secure: this.config.isProduction, sameSite: "strict" }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async loginHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            await this.checkRateLimit(req, "login");
            const { password, ...credentials } = req.body;
            const user = await this.login.execute(credentials, password, req.ip, req.userAgent);

            // MFA Check
            if (user.isTwoFactorEnabled) {
                return {
                    status: 200,
                    body: {
                        mfaRequired: true,
                        tempToken: this.tokenProvider.sign({ userId: user.id, mfa: true }, { expiresIn: "5m" })
                    }
                };
            }

            const { accessToken, refreshToken } = await this.generateTokens(user.id, req);

            return {
                status: 200,
                body: { user, accessToken },
                cookies: [
                    {
                        name: "refreshToken",
                        value: refreshToken,
                        options: {
                            httpOnly: true,
                            secure: this.config.isProduction,
                            sameSite: "strict",
                            maxAge: 7 * 24 * 60 * 60 * 1000
                        }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async verify2FAHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { code, tempToken } = req.body;
            const decoded = this.tokenProvider.verify(tempToken);
            if (!decoded.mfa) throw new UnauthorizedError();

            await this.verifyTOTP.execute(decoded.userId, code);
            const { accessToken, refreshToken } = await this.generateTokens(decoded.userId, req);

            return {
                status: 200,
                body: { accessToken },
                cookies: [
                    {
                        name: "refreshToken",
                        value: refreshToken,
                        options: { httpOnly: true, secure: this.config.isProduction, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async refreshTokenHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) throw new UnauthorizedError("No refresh token provided");

            const { accessToken, refreshToken: newRefreshToken } = await this.rotateRefreshToken.execute(
                refreshToken,
                req.ip,
                req.userAgent,
                req.body.fingerprint
            );

            return {
                status: 200,
                body: { accessToken },
                cookies: [
                    {
                        name: "refreshToken",
                        value: newRefreshToken,
                        options: { httpOnly: true, secure: this.config.isProduction, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 }
                    }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async generate2FAHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            // userId usually from middleware/auth req
            const { userId } = (req as any).user;
            const result = await this.generateTOTP.execute(userId);
            return {
                status: 200,
                body: result
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async sendOtpHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { type } = req.body;
            const { userId } = (req as any).user;
            await (this as any).otpManager.sendOtp(userId, type);
            return {
                status: 200,
                body: { message: `OTP sent via ${type}` }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async logoutHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const authHeader = req.headers["authorization"] as string;
            const token = authHeader?.split(" ")[1];

            if (token) {
                const decoded = this.tokenProvider.decode(token);
                const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);
                await this.logout.execute(token, expiresAt);

                // Revoke current session
                const refreshToken = req.cookies?.refreshToken;
                if (refreshToken) {
                    const session = await (this.login as any).adapter.findSession({ refreshTokenHash: refreshToken });
                    if (session) await this.sessionManager.revokeSession(session.id);
                }
            }

            return {
                status: 204,
                cookies: [
                    { name: "refreshToken", value: "", options: { maxAge: 0 } },
                    { name: "csrf-token", value: "", options: { maxAge: 0 } }
                ]
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async logoutAllDevicesHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { userId } = (req as any).user;
            await this.sessionManager.revokeAllUserSessions(userId);
            return { status: 204 };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async listSessionsHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { userId } = (req as any).user;
            const sessions = await this.sessionManager.getActiveSessions(userId);

            const refreshToken = req.cookies?.refreshToken;
            const currentSession = refreshToken ? await (this.login as any).adapter.findSession({ refreshTokenHash: sha256(refreshToken) }) : null;

            return {
                status: 200,
                body: sessions.map(s => ({
                    id: s.id,
                    ip: s.ip,
                    userAgent: s.userAgent,
                    lastActiveAt: s.lastActiveAt,
                    isCurrent: currentSession ? s.id === currentSession.id : false,
                    createdAt: s.createdAt
                }))
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async revokeSessionHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { userId } = (req as any).user;
            const { sessionId } = req.body;
            await this.sessionManager.revokeSpecificSession(userId, sessionId);
            return { status: 204 };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async revokeOtherSessionsHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { userId } = (req as any).user;
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) throw new UnauthorizedError("Current session not found");

            const currentSession = await (this.login as any).adapter.findSession({ refreshTokenHash: sha256(refreshToken) });
            if (!currentSession) throw new UnauthorizedError("Session invalid");

            await this.sessionManager.revokeOtherSessions(userId, currentSession.id);
            return { status: 204 };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async verifyEmailHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { token } = req.query;
            if (typeof token !== "string") throw new Error("Token is required");
            await this.verifyEmail.execute(token);
            return {
                status: 200,
                body: { message: "Email verified successfully" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async resendVerificationHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { ...credentials } = req.body;
            await this.resendVerification.execute(credentials);
            return {
                status: 200,
                body: { message: "Verification email resent if account exists" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async unlockAccountHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { token } = req.query;
            if (typeof token !== "string") throw new Error("Token is required");
            await this.unlockAccount.execute(token);
            return {
                status: 200,
                body: { message: "Account unlocked successfully. You can now log in." }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async resetPasswordHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { token, newPassword } = req.body;
            await this.resetPassword.execute(token, newPassword);
            return {
                status: 200,
                body: { message: "Password reset successful" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async validateResetTokenHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { token } = req.query;
            if (typeof token !== "string") throw new Error("Token is required");
            const isValid = await this.validateResetToken.execute(token);
            return {
                status: 200,
                body: { isValid }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async verifyOtpHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            const { code, type } = req.body;
            const { userId } = (req as any).user;
            await this.verifyOtp.execute(userId, code, type);
            return {
                status: 200,
                body: { message: "OTP verified" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async forgotPasswordHandler(req: AuthRequest): Promise<AuthResponse> {
        try {
            await this.checkRateLimit(req, "forgot-password");
            const { method, ...credentials } = req.body;
            await this.forgotPassword.execute(credentials, method);
            return {
                status: 200,
                body: { message: "If your account is registered, you will receive a reset link or code" }
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    private handleError(error: any): AuthResponse {
        const status = error instanceof AuthError ? error.status : 500;
        const response: AuthResponse = {
            status,
            body: {
                error: error.message,
                code: error instanceof AuthError ? error.code : "INTERNAL_ERROR"
            }
        };

        if (error instanceof TooManyRequestsError && error.retryAfter) {
            response.headers = {
                "Retry-After": error.retryAfter.toString()
            };
        }

        return response;
    }

    private async checkRateLimit(req: AuthRequest, suffix: string) {
        if (!this.rateLimiter) return;
        try {
            await this.rateLimiter.consume(`${req.ip}:${suffix}`);
        } catch (res: any) {
            throw new TooManyRequestsError(
                "Too many attempts. Please try again later.",
                res.msBeforeNext ? Math.ceil(res.msBeforeNext / 1000) : undefined
            );
        }
    }
}

